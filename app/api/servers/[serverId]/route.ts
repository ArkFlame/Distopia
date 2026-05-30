import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok, readJson } from '@/lib/http';
import { isServerAdmin } from '@/lib/queries';
import { boolInt, clampText, safeSlug } from '@/lib/utils';

export const runtime = 'nodejs';

export async function PATCH(request: Request, ctx: { params: Promise<{ serverId: string }> }) {
  try {
    const user = await requireUser();
    const { serverId } = await ctx.params;
    if (!isServerAdmin(user.id, serverId)) return fail('Server admin required', 403);
    const body = await readJson(request);
    const name = clampText(body.name, 2, 40, 'name');
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 180) : '';
    const publicJoin = boolInt(body.publicJoin);
    const vanityCode = typeof body.vanityCode === 'string' ? safeSlug(body.vanityCode, '') : '';
    if (!vanityCode) return fail('Vanity code required');
    db.prepare('UPDATE servers SET name = ?, description = ?, publicJoin = ?, vanityCode = ? WHERE id = ?').run(name, description, publicJoin, vanityCode, serverId);
    return ok({ saved: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Server update failed');
  }
}
