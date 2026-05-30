import { db } from './db';
import { id, nowIso } from './utils';

const blockedPatterns = [
  /\bidiot\b/i,
  /\bstupid\b/i,
  /\bkill yourself\b/i,
  /\bscam link\b/i,
  /\bfree crypto\b/i
];

const recentMessages = new Map<string, { content: string; count: number; resetAt: number }>();

export function moderateMessage(userId: string, scope: string, content: string): { allowed: boolean; reason?: string } {
  const text = content.trim();
  if (text.length > 1800) return reject(userId, scope, 'Message exceeds 1800 characters', text);
  if (blockedPatterns.some((pattern) => pattern.test(text))) return reject(userId, scope, 'Message blocked by community safety filter', text);

  const now = Date.now();
  const key = `${userId}:${scope}`;
  const previous = recentMessages.get(key);
  if (previous && previous.resetAt > now && previous.content === text) {
    previous.count += 1;
    if (previous.count >= 3) return reject(userId, scope, 'Repeated-message spam detected', text);
    recentMessages.set(key, previous);
    return { allowed: true };
  }
  recentMessages.set(key, { content: text, count: 1, resetAt: now + 20_000 });
  return { allowed: true };
}

function reject(userId: string, scope: string, reason: string, content: string): { allowed: false; reason: string } {
  db.prepare('INSERT INTO moderation_events (id, userId, scope, reason, content, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id(), userId, scope, reason, content.slice(0, 500), nowIso());
  return { allowed: false, reason };
}
