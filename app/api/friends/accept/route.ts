import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok, readJson } from '@/lib/http';
import { clampText } from '@/lib/utils';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson(request);
    const friendId = clampText(body.friendId, 10, 80, 'friendId');
    const relation = db.prepare('SELECT id FROM friends WHERE id = ? AND addresseeId = ? AND status = ?').get(friendId, user.id, 'pending') as { id: string } | undefined;
    if (!relation) return fail('Pending friend request not found', 404);
    db.prepare('UPDATE friends SET status = ? WHERE id = ?').run('accepted', friendId);
    return ok({ accepted: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Friend accept failed');
  }
}
