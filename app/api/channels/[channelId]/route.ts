import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok, readJson } from '@/lib/http';
import { isServerAdmin } from '@/lib/queries';
import { clampText, safeSlug } from '@/lib/utils';

export const runtime = 'nodejs';

export async function PATCH(request: Request, ctx: { params: Promise<{ channelId: string }> }) {
  try {
    const user = await requireUser();
    const { channelId } = await ctx.params;
    const channel = db.prepare('SELECT id, serverId FROM channels WHERE id = ?').get(channelId) as { id: string; serverId: string } | undefined;
    if (!channel) return fail('Channel not found', 404);
    if (!isServerAdmin(user.id, channel.serverId)) return fail('Server admin required', 403);
    const body = await readJson(request);
    const raw = clampText(body.name, 2, 32, 'name');
    const name = safeSlug(raw, 'channel');
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 140) : '';
    db.prepare('UPDATE channels SET name = ?, description = ? WHERE id = ?').run(name, description, channelId);
    return ok({ saved: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Channel update failed');
  }
}
