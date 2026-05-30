import { headers } from 'next/headers';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok, readJson, clientIp } from '@/lib/http';
import { checkRateLimit } from '@/lib/rateLimit';
import { clampText, id, nowIso, safeSlug } from '@/lib/utils';
import { listServersForUser } from '@/lib/queries';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireUser();
    return ok({ servers: listServersForUser(user.id) });
  } catch {
    return fail('Not authenticated', 401);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const h = await headers();
    const limit = checkRateLimit({ key: `${clientIp(h)}:${user.id}`, bucket: 'server_create', limit: 8, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return fail('Server creation cooldown active', 429, limit.rate);
    const body = await readJson(request);
    const name = clampText(body.name, 2, 40, 'name');
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 180) : '';
        const serverId = id();
    const baseSlug = safeSlug(name, 'space');
    let vanity = baseSlug;
    let suffix = 1;
    while (db.prepare('SELECT 1 FROM servers WHERE vanityCode = ?').get(vanity)) vanity = `${baseSlug}-${suffix++}`;
    const channelId = id();
    const createdAt = nowIso();
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('INSERT INTO servers (id, name, description, ownerId, iconUrl, publicJoin, vanityCode, theme, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(serverId, name, description, user.id, '', 1, vanity, 'obsidian', createdAt);
      db.prepare('INSERT INTO server_members (serverId, userId, role, nickname, joinedAt) VALUES (?, ?, ?, ?, ?)').run(serverId, user.id, 'owner', '', createdAt);
      db.prepare('INSERT INTO channels (id, serverId, name, type, position) VALUES (?, ?, ?, ?, ?)').run(channelId, serverId, 'general', 'text', 0);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    return ok({ serverId, channelId, vanityCode: vanity }, { rate: limit.rate });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Server create failed');
  }
}
