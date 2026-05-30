import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { absoluteFromRoot, env } from './env';

export const DISTOPIA_AI_USER_ID = 'distopia-ai';

const dbPath = absoluteFromRoot(env.dbPath);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

type SqlValue = string | number | bigint | null | Uint8Array;
type StatementLike = {
  run: (...params: SqlValue[]) => unknown;
  get: (...params: SqlValue[]) => unknown;
  all: (...params: SqlValue[]) => unknown[];
};

type DatabaseLike = {
  exec: (sql: string) => void;
  prepare: (sql: string) => StatementLike;
};

declare global {
  // eslint-disable-next-line no-var
  var __distopiaDb: DatabaseLike | undefined;
}

export const db: DatabaseLike = globalThis.__distopiaDb ?? new DatabaseSync(dbPath);
globalThis.__distopiaDb = db;

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA busy_timeout = 5000');

export function ensureSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL DEFAULT '',
      emailVerified INTEGER NOT NULL DEFAULT 0,
      displayName TEXT NOT NULL,
      passwordHash TEXT NOT NULL,
      avatarUrl TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      theme TEXT NOT NULL DEFAULT 'obsidian',
      nameColor TEXT NOT NULL DEFAULT '#9b8cff',
      font TEXT NOT NULL DEFAULT 'Inter',
      verified INTEGER NOT NULL DEFAULT 0,
      allowFriendRequests INTEGER NOT NULL DEFAULT 1,
      allowServerInvites INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expiresAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      ownerId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      iconUrl TEXT NOT NULL DEFAULT '',
      publicJoin INTEGER NOT NULL DEFAULT 1,
      vanityCode TEXT UNIQUE,
      theme TEXT NOT NULL DEFAULT 'obsidian',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS server_members (
      serverId TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member',
      nickname TEXT NOT NULL DEFAULT '',
      joinedAt TEXT NOT NULL,
      PRIMARY KEY(serverId, userId)
    );

    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      serverId TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'text',
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      channelId TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      attachmentUrl TEXT NOT NULL DEFAULT '',
      attachmentName TEXT NOT NULL DEFAULT '',
      attachmentMime TEXT NOT NULL DEFAULT '',
      attachmentSize INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      editedAt TEXT NOT NULL DEFAULT '',
      deletedAt INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS friends (
      id TEXT PRIMARY KEY,
      requesterId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      addresseeId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      UNIQUE(requesterId, addresseeId)
    );

    CREATE TABLE IF NOT EXISTS friend_invites (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code TEXT NOT NULL UNIQUE,
      expiresAt TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS server_invites (
      id TEXT PRIMARY KEY,
      serverId TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      code TEXT NOT NULL UNIQUE,
      createdBy TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      maxUses INTEGER NOT NULL DEFAULT 0,
      uses INTEGER NOT NULL DEFAULT 0,
      expiresAt TEXT NOT NULL DEFAULT '',
      allowGuestJoin INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      serverId TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      channelId TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS message_edits (
      id TEXT PRIMARY KEY,
      messageId TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      previousContent TEXT NOT NULL,
      newContent TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS direct_conversations (
      id TEXT PRIMARY KEY,
      directKey TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL DEFAULT 'user',
      title TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS direct_members (
      conversationId TEXT NOT NULL REFERENCES direct_conversations(id) ON DELETE CASCADE,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member',
      joinedAt TEXT NOT NULL,
      PRIMARY KEY(conversationId, userId)
    );

    CREATE TABLE IF NOT EXISTS direct_messages (
      id TEXT PRIMARY KEY,
      conversationId TEXT NOT NULL REFERENCES direct_conversations(id) ON DELETE CASCADE,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      editedAt TEXT NOT NULL DEFAULT '',
      deletedAt INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_direct_members_user ON direct_members(userId, conversationId);
    CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation_created ON direct_messages(conversationId, createdAt);

    CREATE TABLE IF NOT EXISTS moderation_events (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL DEFAULT '',
      scope TEXT NOT NULL,
      reason TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(lower(email)) WHERE email <> '';
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(userId);
    CREATE INDEX IF NOT EXISTS idx_members_user ON server_members(userId);
    CREATE INDEX IF NOT EXISTS idx_channels_server ON channels(serverId);
    CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON messages(channelId, createdAt);
    CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(requesterId, addresseeId);
    CREATE INDEX IF NOT EXISTS idx_message_edits_message ON message_edits(messageId, createdAt);
  `);
}


function addColumnIfMissing(table: string, column: string, ddl: string): void {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!rows.some((row) => row.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

ensureSchema();
ensureSystemAiUser();
addColumnIfMissing('users', 'email', "email TEXT NOT NULL DEFAULT ''");
addColumnIfMissing('users', 'emailVerified', "emailVerified INTEGER NOT NULL DEFAULT 0");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(lower(email)) WHERE email <> ''");
addColumnIfMissing('channels', 'description', "description TEXT NOT NULL DEFAULT ''");
addColumnIfMissing('messages', 'attachmentName', "attachmentName TEXT NOT NULL DEFAULT ''");
addColumnIfMissing('messages', 'attachmentMime', "attachmentMime TEXT NOT NULL DEFAULT ''");
addColumnIfMissing('messages', 'attachmentSize', "attachmentSize INTEGER NOT NULL DEFAULT 0");
addColumnIfMissing('messages', 'editedAt', "editedAt TEXT NOT NULL DEFAULT ''");
addColumnIfMissing('direct_conversations', 'directKey', "directKey TEXT NOT NULL DEFAULT ''");

function ensureSystemAiUser(): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR IGNORE INTO users (id, username, displayName, passwordHash, avatarUrl, bio, theme, nameColor, font, verified, allowFriendRequests, allowServerInvites, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(DISTOPIA_AI_USER_ID, 'distopia_ai', 'Distopia AI', 'system-user-disabled', '/assets/brand/distopia-app-icon.webp', 'Personal AI assistant inside Distopia.', 'obsidian', '#58d5ff', 'Neon Pulse', 1, 0, 0, now);
}
