import { headers } from 'next/headers';
import { currentUser } from '@/lib/auth';
import { clientIp, ok } from '@/lib/http';
import { peekLimitsFor } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function GET() {
  const user = await currentUser();
  const h = await headers();
  const ip = clientIp(h);
  const limits = [...peekLimitsFor(ip), ...(user ? peekLimitsFor(user.id) : [])];
  return ok({ limits });
}
