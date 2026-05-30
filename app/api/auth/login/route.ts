import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { fail, ok, readJson, clientIp } from '@/lib/http';
import { verifyPassword } from '@/lib/password';
import { checkRateLimit } from '@/lib/rateLimit';
import { clampText } from '@/lib/utils';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const h = await headers();
    const body = await readJson(request);
    const username = clampText(body.username, 3, 24, 'username').toLowerCase();
    const password = clampText(body.password, 8, 128, 'password');
    const limit = checkRateLimit({ key: `${clientIp(h)}:${username}`, bucket: 'auth_login', limit: 8, windowMs: 10 * 60 * 1000 });
    if (!limit.allowed) return fail('Too many login attempts. Wait before retrying.', 429, limit.rate);
    const user = db.prepare('SELECT id, passwordHash FROM users WHERE username = ?').get(username) as { id: string; passwordHash: string } | undefined;
    if (!user || !verifyPassword(password, user.passwordHash)) return fail('Invalid username or password', 401, limit.rate);
    await createSession(user.id);
    return ok({ userId: user.id }, { rate: limit.rate });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Login failed');
  }
}
