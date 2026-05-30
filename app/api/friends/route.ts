import { requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { listFriends } from '@/lib/queries';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireUser();
    return ok({ friends: listFriends(user.id) });
  } catch {
    return fail('Not authenticated', 401);
  }
}
