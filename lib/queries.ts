import { db } from './db';
import { nowIso } from './utils';

export function userCanAccessChannel(userId: string, channelId: string): boolean {
  const row = db.prepare(`
    SELECT 1
    FROM channels c
    JOIN server_members sm ON sm.serverId = c.serverId
    WHERE c.id = ? AND sm.userId = ?
  `).get(channelId, userId);
  return Boolean(row);
}

export function userRoleInServer(userId: string, serverId: string): string | null {
  const row = db.prepare('SELECT role FROM server_members WHERE serverId = ? AND userId = ?').get(serverId, userId) as { role: string } | undefined;
  return row?.role ?? null;
}

export function isServerAdmin(userId: string, serverId: string): boolean {
  const role = userRoleInServer(userId, serverId);
  return role === 'owner' || role === 'admin';
}

export function listServersForUser(userId: string) {
  return db.prepare(`
    SELECT s.id, s.name, s.description, s.iconUrl, s.publicJoin, s.vanityCode, s.theme, sm.role
    FROM servers s
    JOIN server_members sm ON sm.serverId = s.id
    WHERE sm.userId = ?
    ORDER BY CASE s.vanityCode WHEN 'distopia' THEN 0 ELSE 1 END, s.createdAt ASC
  `).all(userId);
}

export function listMembers(serverId: string) {
  return db.prepare(`
    SELECT u.id, u.username, u.displayName, u.avatarUrl, u.nameColor, u.font, sm.role, sm.nickname,
      EXISTS(SELECT 1 FROM sessions session WHERE session.userId = u.id AND session.expiresAt > ?) as online
    FROM server_members sm
    JOIN users u ON u.id = sm.userId
    WHERE sm.serverId = ?
    ORDER BY online DESC, CASE sm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.displayName ASC
  `).all(nowIso(), serverId);
}

export function listChannels(serverId: string) {
  return db.prepare('SELECT id, serverId, name, type, position FROM channels WHERE serverId = ? ORDER BY position ASC, name ASC').all(serverId);
}

export function listMessages(channelId: string, limit = 80) {
  return db.prepare(`
    SELECT m.id, m.channelId, m.content, m.attachmentUrl, m.createdAt, u.id as userId, u.username, u.displayName, u.avatarUrl, u.nameColor, u.font
    FROM messages m
    JOIN users u ON u.id = m.userId
    WHERE m.channelId = ? AND m.deletedAt = 0
    ORDER BY m.createdAt DESC
    LIMIT ?
  `).all(channelId, limit).reverse();
}

export function joinOfficialServer(userId: string): void {
  const server = db.prepare('SELECT id FROM servers WHERE vanityCode = ?').get('distopia') as { id: string } | undefined;
  if (!server) return;
  db.prepare('INSERT OR IGNORE INTO server_members (serverId, userId, role, nickname, joinedAt) VALUES (?, ?, ?, ?, ?)')
    .run(server.id, userId, 'member', '', nowIso());
}
