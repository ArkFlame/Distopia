import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok } from '@/lib/http';
import { isServerAdmin } from '@/lib/queries';
import { deleteUploadByUrl } from '@/lib/upload';

export const runtime = 'nodejs';

export async function DELETE(_request: Request, ctx: { params: Promise<{ messageId: string }> }) {
  try {
    const user = await requireUser();
    const { messageId } = await ctx.params;
    const message = db.prepare(`
      SELECT m.id, m.userId, m.attachmentUrl, c.serverId
      FROM messages m
      JOIN channels c ON c.id = m.channelId
      WHERE m.id = ? AND m.deletedAt = 0
    `).get(messageId) as { id: string; userId: string; attachmentUrl: string; serverId: string } | undefined;
    if (!message) return fail('Message not found', 404);
    if (message.userId !== user.id && !isServerAdmin(user.id, message.serverId)) return fail('Cannot edit this message', 403);
    if (message.attachmentUrl) await deleteUploadByUrl(message.attachmentUrl);
    db.prepare("UPDATE messages SET attachmentUrl = '', attachmentName = '', attachmentMime = '', attachmentSize = ? WHERE id = ?").run(0, messageId);
    return ok({ removed: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Attachment delete failed');
  }
}
