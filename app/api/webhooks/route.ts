import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok, readJson } from '@/lib/http';
import { isServerAdmin } from '@/lib/queries';
import { clampText, id, inviteCode, nowIso } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireUser();
    const hooks = db.prepare(`
      SELECT w.id, w.serverId, w.channelId, w.name, w.enabled, w.createdAt
      FROM webhooks w
      JOIN server_members sm ON sm.serverId = w.serverId
      WHERE sm.userId = ?
      ORDER BY w.createdAt DESC
    `).all(user.id);
    return ok({ webhooks: hooks });
  } catch {
    return fail('Not authenticated', 401);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson(request);
    const serverId = clampText(body.serverId, 10, 80, 'serverId');
    const channelId = clampText(body.channelId, 10, 80, 'channelId');
    if (!isServerAdmin(user.id, serverId)) return fail('Server admin required', 403);
    const channel = db.prepare('SELECT id FROM channels WHERE id = ? AND serverId = ?').get(channelId, serverId);
    if (!channel) return fail('Channel not found', 404);
    const name = clampText(body.name || 'Webhook', 2, 32, 'name');
    const token = inviteCode(32);
    const hookId = id();
    db.prepare('INSERT INTO webhooks (id, serverId, channelId, name, token, enabled, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(hookId, serverId, channelId, name, token, 1, nowIso());
    return ok({ webhook: { id: hookId, token, name } });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Webhook create failed');
  }
}
