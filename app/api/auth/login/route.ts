import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { fail, ok, readJson, clientIp } from '@/lib/http';
import { verifyPassword } from '@/lib/password';
import { checkRateLimit } from '@/lib/rateLimit';
import { clampText } from '@/lib/utils';
import { isEmailLike } from '@/lib/email';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const h = await headers();
    const body = await readJson(request);
    const identifier = clampText(body.identifier ?? body.username ?? body.email, 3, 254, 'username or email').toLowerCase();
    const password = clampText(body.password, 8, 128, 'password');
    const limit = checkRateLimit({ key: `${clientIp(h)}:${identifier}`, bucket: 'auth_login', limit: 8, windowMs: 10 * 60 * 1000 });
    if (!limit.allowed) return fail('Too many login attempts. Wait before retrying.', 429, limit.rate);

    const user = isEmailLike(identifier)
      ? db.prepare('SELECT id, passwordHash FROM users WHERE lower(email) = lower(?)').get(identifier) as { id: string; passwordHash: string } | undefined
      : db.prepare('SELECT id, passwordHash FROM users WHERE username = ?').get(identifier) as { id: string; passwordHash: string } | undefined;
    if (!user || !verifyPassword(password, user.passwordHash)) return fail('Invalid username/email or password', 401, limit.rate);
    await createSession(user.id, request);
    return ok({ userId: user.id }, { rate: limit.rate });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Login failed');
  }
}
