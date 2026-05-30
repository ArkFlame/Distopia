import { db, ensureSchema } from '../lib/db';
import { hashPassword } from '../lib/password';
import { id, inviteCode, nowIso } from '../lib/utils';
import { premadeAvatarUrl } from '../lib/avatar';

ensureSchema();

function ensureUser(username: string, displayName: string, password: string, color: string, font: string) {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: string } | undefined;
  if (existing) {
    db.prepare('UPDATE users SET avatarUrl = CASE WHEN avatarUrl = ? THEN ? ELSE avatarUrl END WHERE id = ?').run('', premadeAvatarUrl(existing.id), existing.id);
    return existing.id;
  }
  const userId = id();
  db.prepare(`
    INSERT INTO users (id, username, displayName, passwordHash, avatarUrl, bio, theme, nameColor, font, verified, allowFriendRequests, allowServerInvites, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, username, displayName, hashPassword(password), premadeAvatarUrl(userId), 'Builder on Distopia.', 'obsidian', color, font, 0, 1, 1, nowIso());
  return userId;
}

const ownerId = ensureUser('owner', 'Distopia Owner', 'owner12345', '#9b8cff', 'Inter');
const novaId = ensureUser('nova', 'Nova', 'nova12345', '#58d5ff', 'JetBrains Mono');

let server = db.prepare('SELECT id FROM servers WHERE vanityCode = ?').get('distopia') as { id: string } | undefined;
if (!server) {
  const serverId = id();
  db.prepare(`
    INSERT INTO servers (id, name, description, ownerId, iconUrl, publicJoin, vanityCode, theme, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(serverId, 'Distopia Official', 'Default official space for first-run testing, onboarding, and compact chat.', ownerId, '/assets/brand/distopia-app-icon.webp', 1, 'distopia', 'aurora', nowIso());
  db.prepare('INSERT INTO server_members (serverId, userId, role, nickname, joinedAt) VALUES (?, ?, ?, ?, ?)').run(serverId, ownerId, 'owner', '', nowIso());
  db.prepare('INSERT INTO server_members (serverId, userId, role, nickname, joinedAt) VALUES (?, ?, ?, ?, ?)').run(serverId, novaId, 'member', '', nowIso());
  const general = id();
  const builds = id();
  const drops = id();
  db.prepare('INSERT INTO channels (id, serverId, name, type, position) VALUES (?, ?, ?, ?, ?)').run(general, serverId, 'general', 'text', 0);
  db.prepare('INSERT INTO channels (id, serverId, name, type, position) VALUES (?, ?, ?, ?, ?)').run(builds, serverId, 'builds', 'text', 1);
  db.prepare('INSERT INTO channels (id, serverId, name, type, position) VALUES (?, ?, ?, ?, ?)').run(drops, serverId, 'drops', 'text', 2);
  db.prepare('INSERT INTO messages (id, channelId, userId, content, attachmentUrl, createdAt, editedAt, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id(), general, ownerId, 'Welcome to Distopia Official. Use the home screen to invite friends, create servers, or join by code.', '', nowIso(), '', 0);
  db.prepare('INSERT INTO messages (id, channelId, userId, content, attachmentUrl, createdAt, editedAt, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id(), general, novaId, 'The UI now uses quiet limits, compact menus, deterministic avatars, collapsible panels, and member presence.', '', nowIso(), '', 0);
  db.prepare('INSERT INTO server_invites (id, serverId, code, createdBy, maxUses, uses, expiresAt, allowGuestJoin, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id(), serverId, 'distopia', ownerId, 0, 0, '', 1, nowIso());
  db.prepare('INSERT INTO webhooks (id, serverId, channelId, name, token, enabled, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id(), serverId, general, 'Deploy Bot', inviteCode(28), 1, nowIso());
  server = { id: serverId };
} else {
  db.prepare('UPDATE servers SET name = ?, description = ?, iconUrl = ?, theme = ?, publicJoin = 1 WHERE id = ?')
    .run('Distopia Official', 'Default official space for first-run testing, onboarding, and compact chat.', '/assets/brand/distopia-app-icon.webp', 'aurora', server.id);
  db.prepare('INSERT OR IGNORE INTO server_members (serverId, userId, role, nickname, joinedAt) VALUES (?, ?, ?, ?, ?)').run(server.id, ownerId, 'owner', '', nowIso());
  db.prepare('INSERT OR IGNORE INTO server_members (serverId, userId, role, nickname, joinedAt) VALUES (?, ?, ?, ?, ?)').run(server.id, novaId, 'member', '', nowIso());
  db.prepare('INSERT OR IGNORE INTO server_invites (id, serverId, code, createdBy, maxUses, uses, expiresAt, allowGuestJoin, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id(), server.id, 'distopia', ownerId, 0, 0, '', 1, nowIso());
}

console.log('Seed complete.');
console.log('Official invite: /join/distopia');
console.log('Demo users: owner/owner12345 and nova/nova12345');
