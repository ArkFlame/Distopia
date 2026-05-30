import { DISTOPIA_AI_USER_ID, db } from './db';
import { id, nowIso } from './utils';

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
    ORDER BY s.createdAt ASC
  `).all(userId);
}

export function listChannelsForUser(userId: string) {
  return db.prepare(`
    SELECT c.id, c.serverId, c.name, c.description, c.type, c.position
    FROM channels c
    JOIN server_members sm ON sm.serverId = c.serverId
    WHERE sm.userId = ?
    ORDER BY c.position ASC, c.name ASC
  `).all(userId);
}

export function listMembersForUserServers(userId: string) {
  return db.prepare(`
    SELECT sm.serverId, u.id, u.username, u.displayName, u.avatarUrl, u.nameColor, u.font, sm.role, sm.nickname,
      EXISTS(SELECT 1 FROM sessions session WHERE session.userId = u.id AND session.expiresAt > ?) as online
    FROM server_members sm
    JOIN server_members mine ON mine.serverId = sm.serverId AND mine.userId = ?
    JOIN users u ON u.id = sm.userId
    ORDER BY online DESC, CASE sm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.displayName ASC
  `).all(nowIso(), userId);
}

export function listMembers(serverId: string) {
  return db.prepare(`
    SELECT sm.serverId, u.id, u.username, u.displayName, u.avatarUrl, u.nameColor, u.font, sm.role, sm.nickname,
      EXISTS(SELECT 1 FROM sessions session WHERE session.userId = u.id AND session.expiresAt > ?) as online
    FROM server_members sm
    JOIN users u ON u.id = sm.userId
    WHERE sm.serverId = ?
    ORDER BY online DESC, CASE sm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.displayName ASC
  `).all(nowIso(), serverId);
}

export function listChannels(serverId: string) {
  return db.prepare('SELECT id, serverId, name, description, type, position FROM channels WHERE serverId = ? ORDER BY position ASC, name ASC').all(serverId);
}

export function listMessages(channelId: string, limit = 80) {
  return db.prepare(`
    SELECT m.id, m.channelId, m.content, m.attachmentUrl, m.attachmentName, m.attachmentMime, m.attachmentSize, m.createdAt, m.editedAt,
      (SELECT COUNT(*) FROM message_edits me WHERE me.messageId = m.id) as editHistoryCount,
      u.id as userId, u.username, u.displayName, u.avatarUrl, u.nameColor, u.font
    FROM messages m
    JOIN users u ON u.id = m.userId
    WHERE m.channelId = ? AND m.deletedAt = 0
    ORDER BY m.createdAt DESC
    LIMIT ?
  `).all(channelId, limit).reverse();
}

export function getMessage(messageId: string) {
  return db.prepare(`
    SELECT m.id, m.channelId, m.content, m.attachmentUrl, m.attachmentName, m.attachmentMime, m.attachmentSize, m.createdAt, m.editedAt,
      (SELECT COUNT(*) FROM message_edits me WHERE me.messageId = m.id) as editHistoryCount,
      u.id as userId, u.username, u.displayName, u.avatarUrl, u.nameColor, u.font
    FROM messages m
    JOIN users u ON u.id = m.userId
    WHERE m.id = ? AND m.deletedAt = 0
  `).get(messageId);
}

export function listMessageEdits(messageId: string) {
  return db.prepare(`
    SELECT me.id, me.messageId, me.userId, me.previousContent, me.newContent, me.createdAt, u.username, u.displayName
    FROM message_edits me
    JOIN users u ON u.id = me.userId
    WHERE me.messageId = ?
    ORDER BY me.createdAt DESC
  `).all(messageId);
}

export function listFriends(userId: string) {
  return db.prepare(`
    SELECT f.id, f.status,
      CASE WHEN f.requesterId = ? THEN f.addresseeId ELSE f.requesterId END as otherId,
      CASE WHEN f.requesterId = ? THEN 'outgoing' ELSE 'incoming' END as direction,
      u.username, u.displayName, u.avatarUrl, u.nameColor, u.font,
      EXISTS(SELECT 1 FROM sessions session WHERE session.userId = u.id AND session.expiresAt > ?) as online
    FROM friends f
    JOIN users u ON u.id = CASE WHEN f.requesterId = ? THEN f.addresseeId ELSE f.requesterId END
    WHERE f.requesterId = ? OR f.addresseeId = ?
    ORDER BY f.status = 'accepted' DESC, online DESC, f.createdAt DESC
  `).all(userId, userId, nowIso(), userId, userId, userId);
}

export function ensureAiConversation(userId: string): string {
  return getOrCreateDirectConversation(userId, DISTOPIA_AI_USER_ID, 'ai');
}

export function getOrCreateDirectConversation(userId: string, peerId: string, kind = 'user'): string {
  if (peerId === userId) throw new Error('Cannot message yourself');
  const peer = db.prepare('SELECT id FROM users WHERE id = ?').get(peerId) as { id: string } | undefined;
  if (!peer) throw new Error('User not found');
  if (peerId !== DISTOPIA_AI_USER_ID) {
    const friendship = db.prepare(`
      SELECT 1 FROM friends
      WHERE status = 'accepted'
        AND ((requesterId = ? AND addresseeId = ?) OR (requesterId = ? AND addresseeId = ?))
    `).get(userId, peerId, peerId, userId);
    if (!friendship) throw new Error('Accepted friendship required');
  }
  const [a, b] = [userId, peerId].sort();
  const directKey = peerId === DISTOPIA_AI_USER_ID ? `ai:${userId}` : `dm:${a}:${b}`;
  const existing = db.prepare('SELECT id FROM direct_conversations WHERE directKey = ?').get(directKey) as { id: string } | undefined;
  if (existing) return existing.id;
  const conversationId = id();
  const now = nowIso();
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO direct_conversations (id, directKey, kind, title, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)')
      .run(conversationId, directKey, kind, peerId === DISTOPIA_AI_USER_ID ? 'Distopia AI' : '', now, now);
    db.prepare('INSERT INTO direct_members (conversationId, userId, role, joinedAt) VALUES (?, ?, ?, ?)').run(conversationId, userId, 'member', now);
    db.prepare('INSERT INTO direct_members (conversationId, userId, role, joinedAt) VALUES (?, ?, ?, ?)').run(conversationId, peerId, peerId === DISTOPIA_AI_USER_ID ? 'assistant' : 'member', now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return conversationId;
}

export function userCanAccessDirectConversation(userId: string, conversationId: string): boolean {
  const row = db.prepare('SELECT 1 FROM direct_members WHERE conversationId = ? AND userId = ?').get(conversationId, userId);
  return Boolean(row);
}

export function listDirectConversations(userId: string) {
  ensureAiConversation(userId);
  return db.prepare(`
    SELECT dc.id, dc.kind, dc.title, dc.updatedAt,
      u.id as otherId, u.username, u.displayName, u.avatarUrl, u.nameColor, u.font,
      CASE WHEN u.id = ? THEN 1 ELSE EXISTS(SELECT 1 FROM sessions session WHERE session.userId = u.id AND session.expiresAt > ?) END as online,
      COALESCE((SELECT dm.content FROM direct_messages dm WHERE dm.conversationId = dc.id AND dm.deletedAt = 0 ORDER BY dm.createdAt DESC LIMIT 1), '') as lastMessage,
      COALESCE((SELECT dm.createdAt FROM direct_messages dm WHERE dm.conversationId = dc.id AND dm.deletedAt = 0 ORDER BY dm.createdAt DESC LIMIT 1), dc.updatedAt) as lastMessageAt
    FROM direct_conversations dc
    JOIN direct_members own ON own.conversationId = dc.id AND own.userId = ?
    JOIN direct_members other ON other.conversationId = dc.id AND other.userId <> ?
    JOIN users u ON u.id = other.userId
    ORDER BY datetime(lastMessageAt) DESC
  `).all(DISTOPIA_AI_USER_ID, nowIso(), userId, userId);
}

export function listDirectMessages(userId: string, conversationId: string, limit = 100) {
  if (!userCanAccessDirectConversation(userId, conversationId)) throw new Error('Conversation access denied');
  return db.prepare(`
    SELECT dm.id, dm.conversationId, dm.content, dm.createdAt, dm.editedAt,
      u.id as userId, u.username, u.displayName, u.avatarUrl, u.nameColor, u.font
    FROM direct_messages dm
    JOIN users u ON u.id = dm.userId
    WHERE dm.conversationId = ? AND dm.deletedAt = 0
    ORDER BY dm.createdAt DESC
    LIMIT ?
  `).all(conversationId, limit).reverse();
}

export function getDirectMessage(messageId: string) {
  return db.prepare(`
    SELECT dm.id, dm.conversationId, dm.content, dm.createdAt, dm.editedAt,
      u.id as userId, u.username, u.displayName, u.avatarUrl, u.nameColor, u.font
    FROM direct_messages dm
    JOIN users u ON u.id = dm.userId
    WHERE dm.id = ? AND dm.deletedAt = 0
  `).get(messageId);
}

export function addDirectMessage(conversationId: string, userId: string, content: string) {
  const messageId = id();
  const now = nowIso();
  db.prepare('INSERT INTO direct_messages (id, conversationId, userId, content, createdAt, editedAt, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(messageId, conversationId, userId, content, now, '', 0);
  db.prepare('UPDATE direct_conversations SET updatedAt = ? WHERE id = ?').run(now, conversationId);
  return getDirectMessage(messageId);
}

export function isAiConversation(conversationId: string): boolean {
  const row = db.prepare('SELECT kind FROM direct_conversations WHERE id = ?').get(conversationId) as { kind: string } | undefined;
  return row?.kind === 'ai';
}
