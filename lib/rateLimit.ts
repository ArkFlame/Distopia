import type { RatePublic } from './http';

type Entry = { remaining: number; resetAt: number };
const buckets = new Map<string, Entry>();

type Check = {
  key: string;
  bucket: string;
  limit: number;
  windowMs: number;
};

export function checkRateLimit(input: Check): { allowed: boolean; rate: RatePublic } {
  const now = Date.now();
  const mapKey = `${input.bucket}:${input.key}`;
  const current = buckets.get(mapKey);
  if (!current || current.resetAt <= now) {
    const next: Entry = { remaining: input.limit - 1, resetAt: now + input.windowMs };
    buckets.set(mapKey, next);
    return { allowed: true, rate: toPublic(input, next, now) };
  }
  if (current.remaining <= 0) {
    return { allowed: false, rate: toPublic(input, current, now) };
  }
  current.remaining -= 1;
  buckets.set(mapKey, current);
  return { allowed: true, rate: toPublic(input, current, now) };
}

export function peekLimitsFor(key: string): RatePublic[] {
  const now = Date.now();
  const result: RatePublic[] = [];
  for (const [mapKey, entry] of buckets.entries()) {
    if (!mapKey.endsWith(`:${key}`)) continue;
    const bucket = mapKey.slice(0, -key.length - 1);
    result.push({ bucket, limit: Math.max(entry.remaining, 0), remaining: Math.max(entry.remaining, 0), resetAt: entry.resetAt, retryAfterMs: Math.max(0, entry.resetAt - now) });
  }
  return result;
}

function toPublic(input: Check, entry: Entry, now: number): RatePublic {
  return {
    bucket: input.bucket,
    limit: input.limit,
    remaining: Math.max(0, entry.remaining),
    resetAt: entry.resetAt,
    retryAfterMs: Math.max(0, entry.resetAt - now)
  };
}
