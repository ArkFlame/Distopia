import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { fail, ok, readJson, clientIp } from '@/lib/http';
import { moderateMessage } from '@/lib/moderation';
import { checkRateLimit } from '@/lib/rateLimit';
import { id, nowIso } from '@/lib/utils';

export const runtime = 'nodejs';

export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const hook = db.prepare('SELECT id, channelId, name, enabled FROM webhooks WHERE token = ?').get(token) as { id: string; channelId: string; name: string; enabled: number } | undefined;
    if (!hook || !hook.enabled) return fail('Webhook not found', 404);
    const h = await headers();
    const limit = checkRateLimit({ key: `${clientIp(h)}:${hook.id}`, bucket: 'webhook_post', limit: 30, windowMs: 60_000 });
    if (!limit.allowed) return fail('Webhook cooldown active', 429, limit.rate);
    const body = await readJson(request);
    const content = typeof body.content === 'string' ? body.content.trim().slice(0, 1800) : '';
    if (!content) return fail('content required', 400, limit.rate);
    const botUser = ensureWebhookUser(hook.name);
    const moderation = moderateMessage(botUser, hook.channelId, content);
    if (!moderation.allowed) return fail(moderation.reason || 'Webhook message blocked', 400, limit.rate);
    const messageId = id();
    db.prepare('INSERT INTO messages (id, channelId, userId, content, attachmentUrl, createdAt, editedAt, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(messageId, hook.channelId, botUser, content, '', nowIso(), '', 0);
    return ok({ messageId }, { rate: limit.rate });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Webhook failed');
  }
}

function ensureWebhookUser(name: string): string {
  const username = 'webhook_bot';
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: string } | undefined;
  if (existing) return existing.id;
  const userId = id();
  db.prepare(`
    INSERT INTO users (id, username, displayName, passwordHash, avatarUrl, bio, theme, nameColor, font, verified, allowFriendRequests, allowServerInvites, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, username, name || 'Webhook', 'disabled', '', 'System webhook identity.', 'obsidian', '#58d5ff', 'JetBrains Mono', 1, 0, 0, nowIso());
  return userId;
}
