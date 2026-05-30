import { headers } from 'next/headers';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok, clientIp } from '@/lib/http';
import { moderateMessage } from '@/lib/moderation';
import { checkRateLimit } from '@/lib/rateLimit';
import { getMessage, listMessages, userCanAccessChannel } from '@/lib/queries';
import { saveUpload } from '@/lib/upload';
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
    const file = (form.get('attachment') || form.get('image')) as FormDataEntryValue | null;
    if (!content) return fail(file instanceof File && file.size > 0 ? 'Write a message before attaching files' : 'Message required', 400, limit.rate);
    const moderation = moderateMessage(user.id, channelId, content);
    if (!moderation.allowed) return fail(moderation.reason || 'Message blocked', 400, limit.rate);
    let attachmentUrl = '';
    let attachmentName = '';
    let attachmentMime = '';
    let attachmentSize = 0;
    if (file instanceof File && file.size > 0) {
      const saved = await saveUpload(file, 'message', { allowImages: true, allowZip: true });
      attachmentUrl = saved.url;
      attachmentName = saved.name;
      attachmentMime = saved.mime;
      attachmentSize = saved.size;
    }
    const messageId = id();
    db.prepare('INSERT INTO messages (id, channelId, userId, content, attachmentUrl, attachmentName, attachmentMime, attachmentSize, createdAt, editedAt, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(messageId, channelId, user.id, content, attachmentUrl, attachmentName, attachmentMime, attachmentSize, nowIso(), '', 0);
    return ok({ message: getMessage(messageId) }, { rate: limit.rate });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Message failed');
  }
}
