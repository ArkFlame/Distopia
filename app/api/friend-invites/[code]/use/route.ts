import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok } from '@/lib/http';
import { id, nowIso } from '@/lib/utils';

export const runtime = 'nodejs';

export async function POST(_request: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const user = await requireUser();
    const { code } = await ctx.params;
    const invite = db.prepare('SELECT userId FROM friend_invites WHERE code = ?').get(code) as { userId: string } | undefined;
    if (!invite) return fail('Friend invite not found', 404);
    if (invite.userId === user.id) return fail('Cannot add yourself');
    const target = db.prepare('SELECT allowFriendRequests FROM users WHERE id = ?').get(invite.userId) as { allowFriendRequests: number } | undefined;
    if (!target?.allowFriendRequests) return fail('User does not allow friend requests', 403);
    const a = user.id < invite.userId ? user.id : invite.userId;
    const b = user.id < invite.userId ? invite.userId : user.id;
    db.prepare('INSERT OR IGNORE INTO friends (id, requesterId, addresseeId, status, createdAt) VALUES (?, ?, ?, ?, ?)').run(id(), a, b, 'pending', nowIso());
    return ok({ requested: true });
  } catch {
    return fail('Not authenticated', 401);
  }
}
