import { NextResponse } from 'next/server';

export type ApiOk<T> = { ok: true; data: T; rate?: RatePublic };
export type ApiErr = { ok: false; error: string; rate?: RatePublic };
export type RatePublic = { bucket: string; limit: number; remaining: number; resetAt: number; retryAfterMs: number };

export function ok<T>(data: T, init?: ResponseInit & { rate?: RatePublic }): NextResponse<ApiOk<T>> {
  const response = NextResponse.json({ ok: true, data, rate: init?.rate } as ApiOk<T>, { status: init?.status || 200 });
  if (init?.rate) applyRateHeaders(response, init.rate);
  return response;
}

export function fail(error: string, status = 400, rate?: RatePublic): NextResponse<ApiErr> {
  const response = NextResponse.json({ ok: false, error, rate } as ApiErr, { status });
  if (rate) applyRateHeaders(response, rate);
  return response;
}

function applyRateHeaders(response: NextResponse, rate: RatePublic): void {
  response.headers.set('X-RateLimit-Bucket', rate.bucket);
  response.headers.set('X-RateLimit-Limit', String(rate.limit));
  response.headers.set('X-RateLimit-Remaining', String(rate.remaining));
  response.headers.set('X-RateLimit-Reset', String(rate.resetAt));
  response.headers.set('Retry-After', String(Math.ceil(rate.retryAfterMs / 1000)));
}

export async function readJson<T extends Record<string, unknown>>(request: Request): Promise<T> {
  const type = request.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new Error('Expected application/json');
  const json = await request.json();
  if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error('Invalid JSON body');
  return json as T;
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return headers.get('x-real-ip') || 'unknown';
}
