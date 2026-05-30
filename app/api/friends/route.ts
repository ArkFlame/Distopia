import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireUser();
    const friends = db.prepare(`
      SELECT f.id, f.status,
        CASE WHEN f.requesterId = ? THEN f.addresseeId ELSE f.requesterId END as otherId,
        CASE WHEN f.requesterId = ? THEN 'outgoing' ELSE 'incoming' END as direction,
        u.username, u.displayName, u.avatarUrl, u.nameColor, u.font
      FROM friends f
      JOIN users u ON u.id = CASE WHEN f.requesterId = ? THEN f.addresseeId ELSE f.requesterId END
      WHERE f.requesterId = ? OR f.addresseeId = ?
      ORDER BY f.createdAt DESC
    `).all(user.id, user.id, user.id, user.id, user.id);
    return ok({ friends });
  } catch {
    return fail('Not authenticated', 401);
  }
}
