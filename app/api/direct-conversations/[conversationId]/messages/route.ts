import { headers } from 'next/headers';
import { DISTOPIA_AI_USER_ID, db } from '@/lib/db';
import { env } from '@/lib/env';
import { requireUser } from '@/lib/auth';
import { clientIp, fail, ok, readJson } from '@/lib/http';
import { moderateMessage } from '@/lib/moderation';
import { checkRateLimit } from '@/lib/rateLimit';
import { addDirectMessage, isAiConversation, listDirectMessages, userCanAccessDirectConversation } from '@/lib/queries';
import { clampText } from '@/lib/utils';

export const runtime = 'nodejs';

type DirectMessage = {
  userId: string;
  content: string;
};

export async function GET(_request: Request, ctx: { params: Promise<{ conversationId: string }> }) {
  try {
    const user = await requireUser();
    const { conversationId } = await ctx.params;
    if (!userCanAccessDirectConversation(user.id, conversationId)) return fail('Conversation access denied', 403);
    return ok({ messages: listDirectMessages(user.id, conversationId) });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Conversation load failed', 401);
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ conversationId: string }> }) {
  try {
    const user = await requireUser();
    const { conversationId } = await ctx.params;
    if (!userCanAccessDirectConversation(user.id, conversationId)) return fail('Conversation access denied', 403);
    const h = await headers();
    const limit = checkRateLimit({ key: `${clientIp(h)}:${user.id}`, bucket: 'dm_send', limit: 10, windowMs: 10_000 });
    if (!limit.allowed) return fail('DM cooldown active', 429, limit.rate);
    const body = await readJson(request);
    const content = clampText(body.content, 1, 4000, 'content');
    const moderation = moderateMessage(user.id, conversationId, content);
    if (!moderation.allowed) return fail(moderation.reason || 'Message blocked', 400, limit.rate);

    const userMessage = addDirectMessage(conversationId, user.id, content);
    let aiError = '';
    if (isAiConversation(conversationId)) {
      try {
        const reply = await requestAiReply(conversationId, content);
        if (reply) addDirectMessage(conversationId, DISTOPIA_AI_USER_ID, reply);
      } catch (error) {
        aiError = error instanceof Error ? error.message : 'AI reply failed';
      }
    }
    return ok({ message: userMessage, messages: listDirectMessages(user.id, conversationId), aiError }, { rate: limit.rate });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'DM send failed');
  }
}

async function requestAiReply(conversationId: string, latest: string): Promise<string> {
  if (!env.openRouterApiKey) throw new Error('OPENROUTER_API_KEY is not configured');
  const history = db.prepare(`
    SELECT userId, content FROM direct_messages
    WHERE conversationId = ? AND deletedAt = 0
    ORDER BY createdAt DESC
    LIMIT 12
  `).all(conversationId).reverse() as DirectMessage[];
  const messages = [
    {
      role: 'system',
      content: 'You are Distopia AI, a concise personal assistant inside the Distopia chat app. Be useful, direct, safe, and compact.'
    },
    ...history.map((message) => ({
      role: message.userId === DISTOPIA_AI_USER_ID ? 'assistant' : 'user',
      content: message.content
    }))
  ];
  if (!history.some((message) => message.content === latest)) messages.push({ role: 'user', content: latest });
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.appUrl,
      'X-Title': 'Distopia'
    },
    body: JSON.stringify({
      model: env.openRouterModel,
      messages,
      max_tokens: 700,
      temperature: 0.45
    })
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OpenRouter error ${response.status}${text ? `: ${text.slice(0, 180)}` : ''}`);
  }
  const json = await response.json() as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('OpenRouter returned an empty response');
  return content.slice(0, 4000);
}
