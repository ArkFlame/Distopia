import { headers } from 'next/headers';
import { currentUser, sanitizeUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok } from '@/lib/http';
import { publicBaseUrl } from '@/lib/utils';
import { listChannels, listMembers, listMessages, listServersForUser } from '@/lib/queries';

export const runtime = 'nodejs';

export async function GET() {
  const user = await currentUser();
  if (!user) return fail('Not authenticated', 401);
  const servers = listServersForUser(user.id) as any[];
  const selected = servers[0];
  const channels = selected ? listChannels(selected.id) as any[] : [];
  const selectedChannel = channels[0];
  const members = selected ? listMembers(selected.id) as any[] : [];
  const messages = selectedChannel ? listMessages(selectedChannel.id) as any[] : [];
  const friends = db.prepare(`
    SELECT f.id, f.status,
      CASE WHEN f.requesterId = ? THEN f.addresseeId ELSE f.requesterId END as otherId,
      CASE WHEN f.requesterId = ? THEN 'outgoing' ELSE 'incoming' END as direction,
      u.username, u.displayName, u.avatarUrl, u.nameColor, u.font
    FROM friends f
    JOIN users u ON u.id = CASE WHEN f.requesterId = ? THEN f.addresseeId ELSE f.requesterId END
    WHERE f.requesterId = ? OR f.addresseeId = ?
    ORDER BY f.createdAt DESC
  `).all(user.id, user.id, user.id, user.id, user.id);
  const webhooks = selected ? db.prepare('SELECT id, serverId, channelId, name, enabled, createdAt FROM webhooks WHERE serverId = ? ORDER BY createdAt DESC').all(selected.id) : [];
  const invites = selected ? db.prepare('SELECT id, serverId, code, uses, maxUses, createdAt FROM server_invites WHERE serverId = ? ORDER BY createdAt DESC').all(selected.id) : [];
  const h = await headers();
  return ok({ user: sanitizeUser(user), servers, channels, members, messages, friends, webhooks, invites, appUrl: publicBaseUrl(h) });
}
