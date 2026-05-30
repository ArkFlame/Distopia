import { headers } from 'next/headers';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok, clientIp } from '@/lib/http';
import { moderateMessage } from '@/lib/moderation';
import { checkRateLimit } from '@/lib/rateLimit';
import { listMessages, userCanAccessChannel } from '@/lib/queries';
import { saveImage } from '@/lib/upload';
import { id, nowIso } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET(_request: Request, ctx: { params: Promise<{ channelId: string }> }) {
  try {
    const user = await requireUser();
    const { channelId } = await ctx.params;
    if (!userCanAccessChannel(user.id, channelId)) return fail('Channel access denied', 403);
    return ok({ messages: listMessages(channelId) });
  } catch {
    return fail('Not authenticated', 401);
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ channelId: string }> }) {
  try {
    const user = await requireUser();
    const { channelId } = await ctx.params;
    if (!userCanAccessChannel(user.id, channelId)) return fail('Channel access denied', 403);
    const h = await headers();
    const limit = checkRateLimit({ key: `${clientIp(h)}:${user.id}`, bucket: 'message_send', limit: 8, windowMs: 10_000 });
    if (!limit.allowed) return fail('Message cooldown active', 429, limit.rate);
    const form = await request.formData();
    const content = String(form.get('content') || '').trim();
    const file = form.get('image');
    if (!content && !(file instanceof File && file.size > 0)) return fail('Message or image required', 400, limit.rate);
    const moderation = moderateMessage(user.id, channelId, content || '[image]');
    if (!moderation.allowed) return fail(moderation.reason || 'Message blocked', 400, limit.rate);
    let attachmentUrl = '';
    if (file instanceof File && file.size > 0) attachmentUrl = await saveImage(file, 'message');
    const messageId = id();
    db.prepare('INSERT INTO messages (id, channelId, userId, content, attachmentUrl, createdAt, editedAt, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(messageId, channelId, user.id, content, attachmentUrl, nowIso(), '', 0);
    return ok({ messageId, attachmentUrl }, { rate: limit.rate });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Message failed');
  }
}
