import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok, readJson } from '@/lib/http';
import { isServerAdmin, listChannels, userRoleInServer } from '@/lib/queries';
import { clampText, id, safeSlug } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET(_request: Request, ctx: { params: Promise<{ serverId: string }> }) {
  try {
    const user = await requireUser();
    const { serverId } = await ctx.params;
    if (!userRoleInServer(user.id, serverId)) return fail('Not a server member', 403);
    return ok({ channels: listChannels(serverId) });
  } catch {
    return fail('Not authenticated', 401);
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ serverId: string }> }) {
  try {
    const user = await requireUser();
    const { serverId } = await ctx.params;
    if (!isServerAdmin(user.id, serverId)) return fail('Server admin required', 403);
    const body = await readJson(request);
    const raw = clampText(body.name, 2, 32, 'name');
    const name = safeSlug(raw, 'channel');
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 140) : '';
    const position = (db.prepare('SELECT COUNT(*) as count FROM channels WHERE serverId = ?').get(serverId) as { count: number }).count;
    const channelId = id();
    db.prepare('INSERT INTO channels (id, serverId, name, description, type, position) VALUES (?, ?, ?, ?, ?, ?)').run(channelId, serverId, name, description, 'text', position);
    return ok({ channelId });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Channel create failed');
  }
}
