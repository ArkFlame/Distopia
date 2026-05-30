import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok } from '@/lib/http';
import { listMessageEdits, userCanAccessChannel } from '@/lib/queries';

export const runtime = 'nodejs';

export async function GET(_request: Request, ctx: { params: Promise<{ messageId: string }> }) {
  try {
    const user = await requireUser();
    const { messageId } = await ctx.params;
    const message = db.prepare('SELECT channelId FROM messages WHERE id = ? AND deletedAt = 0').get(messageId) as { channelId: string } | undefined;
    if (!message) return fail('Message not found', 404);
    if (!userCanAccessChannel(user.id, message.channelId)) return fail('Channel access denied', 403);
    return ok({ entries: listMessageEdits(messageId) });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Edit history failed');
  }
}
