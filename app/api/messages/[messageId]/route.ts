import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok, readJson } from '@/lib/http';
import { moderateMessage } from '@/lib/moderation';
import { getMessage, userRoleInServer } from '@/lib/queries';
import { deleteUploadByUrl } from '@/lib/upload';
import { clampText, id, nowIso } from '@/lib/utils';

export const runtime = 'nodejs';

type MessageRecord = {
  id: string;
  userId: string;
  channelId: string;
  serverId: string;
  content: string;
  attachmentUrl: string;
};

function loadMessage(messageId: string): MessageRecord | undefined {
  return db.prepare(`
    SELECT m.id, m.userId, m.channelId, c.serverId, m.content, m.attachmentUrl
    FROM messages m
    JOIN channels c ON c.id = m.channelId
    WHERE m.id = ? AND m.deletedAt = 0
  `).get(messageId) as MessageRecord | undefined;
}

export async function PATCH(request: Request, ctx: { params: Promise<{ messageId: string }> }) {
  try {
    const user = await requireUser();
    const { messageId } = await ctx.params;
    const message = loadMessage(messageId);
    if (!message) return fail('Message not found', 404);
    if (message.userId !== user.id) return fail('Only the author can edit this message', 403);

    const body = await readJson(request);
    const content = clampText(body.content, 1, 1800, 'content');
    if (content === message.content) return ok({ message: getMessage(messageId) });

    const moderation = moderateMessage(user.id, message.channelId, content);
    if (!moderation.allowed) return fail(moderation.reason || 'Message blocked', 400);

    const editedAt = nowIso();
    db.prepare('INSERT INTO message_edits (id, messageId, userId, previousContent, newContent, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id(), messageId, user.id, message.content, content, editedAt);
    db.prepare('UPDATE messages SET content = ?, editedAt = ? WHERE id = ?').run(content, editedAt, messageId);
    return ok({ message: getMessage(messageId) });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Message edit failed');
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ messageId: string }> }) {
  try {
    const user = await requireUser();
    const { messageId } = await ctx.params;
    const message = loadMessage(messageId);
    if (!message) return fail('Message not found', 404);
    if (userRoleInServer(user.id, message.serverId) !== 'owner') return fail('Server owner required', 403);

    if (message.attachmentUrl) await deleteUploadByUrl(message.attachmentUrl);
    db.prepare('UPDATE messages SET deletedAt = 1 WHERE id = ?').run(messageId);
    return ok({ deleted: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Message delete failed');
  }
}
