import { headers } from 'next/headers';
import { currentUser, sanitizeUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok } from '@/lib/http';
import { publicBaseUrl } from '@/lib/utils';
import { listChannelsForUser, listDirectConversations, listDirectMessages, listFriends, listMembersForUserServers, listMessages, listServersForUser } from '@/lib/queries';

export const runtime = 'nodejs';

export async function GET() {
  const user = await currentUser();
  if (!user) return fail('Not authenticated', 401);
  const servers = listServersForUser(user.id) as any[];
  const channels = listChannelsForUser(user.id) as any[];
  const members = listMembersForUserServers(user.id) as any[];
  const selectedChannel = channels[0];
  const messages = selectedChannel ? listMessages(selectedChannel.id) as any[] : [];
  const friends = listFriends(user.id) as any[];
  const directConversations = listDirectConversations(user.id) as any[];
  const selectedDirect = directConversations[0];
  const directMessages = selectedDirect ? listDirectMessages(user.id, selectedDirect.id) as any[] : [];
  const selected = servers[0];
  const webhooks = selected ? db.prepare('SELECT id, serverId, channelId, name, enabled, createdAt FROM webhooks WHERE serverId = ? ORDER BY createdAt DESC').all(selected.id) : [];
  const invites = selected ? db.prepare('SELECT id, serverId, code, uses, maxUses, createdAt FROM server_invites WHERE serverId = ? ORDER BY createdAt DESC').all(selected.id) : [];
  const h = await headers();
  return ok({ user: sanitizeUser(user), servers, channels, members, messages, friends, directConversations, directMessages, webhooks, invites, appUrl: publicBaseUrl(h) });
}
