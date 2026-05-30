import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ok, fail } from '@/lib/http';
import { id, inviteCode, nowIso } from '@/lib/utils';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const user = await requireUser();
    const code = inviteCode(14);
    const inviteId = id();
    db.prepare('INSERT INTO friend_invites (id, userId, code, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)').run(inviteId, user.id, code, '', nowIso());
    return ok({ invite: { id: inviteId, code } });
  } catch {
    return fail('Not authenticated', 401);
  }
}
