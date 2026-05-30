import { cookies } from 'next/headers';
import { db } from './db';
import { env } from './env';
import { id, nowIso, token } from './utils';

export type User = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  theme: string;
  nameColor: string;
  font: string;
  verified: number;
  allowFriendRequests: number;
  allowServerInvites: number;
  createdAt: string;
};

export async function currentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(env.cookieName)?.value;
  if (!sessionId) return null;
  const row = db.prepare(`
    SELECT u.id, u.username, u.displayName, u.avatarUrl, u.bio, u.theme, u.nameColor, u.font, u.verified, u.allowFriendRequests, u.allowServerInvites, u.createdAt
    FROM sessions s
    JOIN users u ON u.id = s.userId
    WHERE s.id = ? AND s.expiresAt > ?
  `).get(sessionId, nowIso()) as User | undefined;
  return row ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) throw new Error('Not authenticated');
  return user;
}

export async function createSession(userId: string): Promise<string> {
  const sessionId = token(32);
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  db.prepare('INSERT INTO sessions (id, userId, expiresAt) VALUES (?, ?, ?)').run(sessionId, userId, expires);
  const cookieStore = await cookies();
  cookieStore.set(env.cookieName, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.secureCookies,
    path: '/',
    expires: new Date(expires)
  });
  return sessionId;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(env.cookieName)?.value;
  if (sessionId) db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  cookieStore.delete(env.cookieName);
}

export function sanitizeUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    theme: user.theme,
    nameColor: user.nameColor,
    font: user.font,
    verified: Boolean(user.verified),
    allowFriendRequests: Boolean(user.allowFriendRequests),
    allowServerInvites: Boolean(user.allowServerInvites),
    createdAt: user.createdAt
  };
}

export function createUserId(): string {
  return id();
}
