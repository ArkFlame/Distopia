import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { fail, ok, readJson, clientIp } from '@/lib/http';
import { hashPassword } from '@/lib/password';
import { checkRateLimit } from '@/lib/rateLimit';
import { clampText, id, nowIso } from '@/lib/utils';
import { premadeAvatarUrl } from '@/lib/avatar';
import { normalizePopularEmail } from '@/lib/email';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const h = await headers();
    const limit = checkRateLimit({ key: clientIp(h), bucket: 'auth_register_ip', limit: 4, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return fail('Too many registrations. Wait before retrying.', 429, limit.rate);

    const body = await readJson(request);
    const email = normalizePopularEmail(body.email);
    const username = clampText(body.username, 3, 24, 'username').toLowerCase();
    if (!/^[a-z0-9_]+$/.test(username)) return fail('Username must use a-z, 0-9, underscore only', 400, limit.rate);
    const displayName = clampText(body.displayName || username, 2, 32, 'displayName');
    const password = clampText(body.password, 8, 128, 'password');

    const existing = db.prepare('SELECT username, email FROM users WHERE username = ? OR lower(email) = lower(?)').get(username, email) as { username: string; email: string } | undefined;
    if (existing?.username === username) return fail('Username already exists', 409, limit.rate);
    if (existing?.email?.toLowerCase() === email) return fail('Email already exists', 409, limit.rate);

    const userId = id();
    db.prepare(`
      INSERT INTO users (id, username, email, emailVerified, displayName, passwordHash, avatarUrl, bio, theme, nameColor, font, verified, allowFriendRequests, allowServerInvites, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, username, email, 0, displayName, hashPassword(password), premadeAvatarUrl(userId), '', 'obsidian', '#9b8cff', 'Inter', 0, 1, 1, nowIso());
    await createSession(userId, request);
    return ok({ userId, emailVerified: false }, { rate: limit.rate });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    if (message.includes('UNIQUE')) return fail('Username or email already exists', 409);
    return fail(message);
  }
}
