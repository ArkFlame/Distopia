import crypto from 'node:crypto';

export function id(): string {
  return crypto.randomUUID();
}

export function token(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function inviteCode(length = 10): string {
  return crypto.randomBytes(Math.ceil(length * 0.75)).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, length);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function clampText(value: unknown, min: number, max: number, field: string): string {
  if (typeof value !== 'string') throw new Error(`${field} must be text`);
  const text = value.trim();
  if (text.length < min) throw new Error(`${field} must be at least ${min} characters`);
  if (text.length > max) throw new Error(`${field} must be at most ${max} characters`);
  return text;
}

export function safeSlug(value: string, fallback: string): string {
  const cleaned = value.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return cleaned || fallback;
}

export function boolInt(value: unknown): number {
  return value === true || value === 'true' || value === 1 || value === '1' ? 1 : 0;
}

export function publicBaseUrl(headers: Headers): string {
  const proto = headers.get('x-forwarded-proto') || 'http';
  const host = headers.get('host') || 'localhost:3928';
  return `${proto}://${host}`;
}
