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
    const existing = db.prepare(`
      SELECT id FROM friends
      WHERE (requesterId = ? AND addresseeId = ?) OR (requesterId = ? AND addresseeId = ?)
    `).get(invite.userId, user.id, user.id, invite.userId) as { id: string } | undefined;
    if (existing) {
      db.prepare('UPDATE friends SET status = ? WHERE id = ?').run('accepted', existing.id);
      return ok({ accepted: true });
    }
    db.prepare('INSERT INTO friends (id, requesterId, addresseeId, status, createdAt) VALUES (?, ?, ?, ?, ?)').run(id(), invite.userId, user.id, 'accepted', nowIso());
    return ok({ accepted: true });
  } catch {
    return fail('Not authenticated', 401);
  }
}
