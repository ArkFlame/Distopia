import { cookies } from 'next/headers';
import { db } from './db';
import { env } from './env';
import { id, nowIso, token } from './utils';

export type User = {
  id: string;
  username: string;
  email: string;
  emailVerified: number;
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
    SELECT u.id, u.username, u.email, u.emailVerified, u.displayName, u.avatarUrl, u.bio, u.theme, u.nameColor, u.font, u.verified, u.allowFriendRequests, u.allowServerInvites, u.createdAt
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


function hostWithoutPort(value: string): string {
  return value.replace(/^\[/, '').replace(/\]$/, '').split(':')[0]?.toLowerCase() || '';
}

function isLocalOrPrivateHost(value: string): boolean {
  const host = hostWithoutPort(value);
  if (!host) return true;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
  if (host.startsWith('192.168.') || host.startsWith('10.')) return true;
  const match = /^172\.(\d+)\./.exec(host);
  if (match) {
    const second = Number(match[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

function shouldUseSecureCookie(request?: Request): boolean {
  const mode = env.secureCookiesMode;
  const requestUrl = request ? new URL(request.url) : null;
  const host = request?.headers.get('host') || requestUrl?.host || '';
  const forwardedProto = request?.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase() || '';
  const requestProto = forwardedProto || requestUrl?.protocol.replace(':', '') || '';

  if (isLocalOrPrivateHost(host)) return false;
  if (mode === 'false' || mode === '0' || mode === 'off') return false;
  if (mode === 'true' || mode === '1' || mode === 'on') return requestProto === 'https' || env.appUrl.startsWith('https://');
  if (requestProto === 'https') return true;

  try {
    const appUrl = new URL(env.appUrl);
    return appUrl.protocol === 'https:' && !isLocalOrPrivateHost(appUrl.host);
  } catch {
    return false;
  }
}

export async function createSession(userId: string, request?: Request): Promise<string> {
  const sessionId = token(32);
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  db.prepare('INSERT INTO sessions (id, userId, expiresAt) VALUES (?, ?, ?)').run(sessionId, userId, expires);
  const cookieStore = await cookies();
  cookieStore.set(env.cookieName, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookie(request),
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
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
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
