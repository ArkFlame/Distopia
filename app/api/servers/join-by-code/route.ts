import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok, readJson } from '@/lib/http';
import { clampText, nowIso } from '@/lib/utils';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson(request);
    const code = clampText(body.code, 2, 64, 'code');
    const invite = db.prepare(`
      SELECT i.id, i.serverId, i.maxUses, i.uses, s.publicJoin
      FROM server_invites i
      JOIN servers s ON s.id = i.serverId
      WHERE i.code = ?
    `).get(code) as { id: string; serverId: string; maxUses: number; uses: number; publicJoin: number } | undefined;
    if (!invite) return fail('Invite not found', 404);
    if (!invite.publicJoin) return fail('This server is closed to new joins', 403);
    if (invite.maxUses > 0 && invite.uses >= invite.maxUses) return fail('Invite usage limit reached', 403);
    db.prepare('INSERT OR IGNORE INTO server_members (serverId, userId, role, nickname, joinedAt) VALUES (?, ?, ?, ?, ?)')
      .run(invite.serverId, user.id, 'member', '', nowIso());
    db.prepare('UPDATE server_invites SET uses = uses + 1 WHERE id = ?').run(invite.id);
    return ok({ joined: true, serverId: invite.serverId });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Join failed');
  }
}
