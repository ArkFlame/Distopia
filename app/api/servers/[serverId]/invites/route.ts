import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok, readJson } from '@/lib/http';
import { isServerAdmin, userRoleInServer } from '@/lib/queries';
import { id, inviteCode, nowIso, safeSlug } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET(_request: Request, ctx: { params: Promise<{ serverId: string }> }) {
  try {
    const user = await requireUser();
    const { serverId } = await ctx.params;
    if (!userRoleInServer(user.id, serverId)) return fail('Not a server member', 403);
    const invites = db.prepare('SELECT id, code, uses, maxUses, createdAt FROM server_invites WHERE serverId = ? ORDER BY createdAt DESC').all(serverId);
    return ok({ invites });
  } catch {
    return fail('Not authenticated', 401);
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ serverId: string }> }) {
  try {
    const user = await requireUser();
    const { serverId } = await ctx.params;
    if (!isServerAdmin(user.id, serverId)) return fail('Server admin required', 403);
    const body: Record<string, unknown> = await readJson(request).catch(() => ({} as Record<string, unknown>));
    let code = typeof body.customCode === 'string' && body.customCode.trim() ? safeSlug(body.customCode, '') : inviteCode(10);
    if (!code) code = inviteCode(10);
    if (db.prepare('SELECT 1 FROM server_invites WHERE code = ?').get(code)) code = `${code}-${inviteCode(4)}`;
    const inviteId = id();
    db.prepare('INSERT INTO server_invites (id, serverId, code, createdBy, maxUses, uses, expiresAt, allowGuestJoin, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(inviteId, serverId, code, user.id, 0, 0, '', 1, nowIso());
    return ok({ invite: { id: inviteId, code } });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Invite create failed');
  }
}
