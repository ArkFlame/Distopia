import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok, readJson } from '@/lib/http';
import { clampText, id, nowIso } from '@/lib/utils';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson(request);
    const username = clampText(body.username, 3, 24, 'username').toLowerCase();
    const target = db.prepare('SELECT id, allowFriendRequests FROM users WHERE username = ?').get(username) as { id: string; allowFriendRequests: number } | undefined;
    if (!target) return fail('User not found', 404);
    if (target.id === user.id) return fail('Cannot add yourself');
    if (!target.allowFriendRequests) return fail('User does not allow friend requests', 403);
    db.prepare('INSERT OR IGNORE INTO friends (id, requesterId, addresseeId, status, createdAt) VALUES (?, ?, ?, ?, ?)').run(id(), user.id, target.id, 'pending', nowIso());
    return ok({ requested: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Friend request failed');
  }
}
