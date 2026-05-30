import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok } from '@/lib/http';
import { saveImage } from '@/lib/upload';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const form = await request.formData();
    const file = form.get('avatar');
    if (!(file instanceof File)) return fail('Missing avatar file');
    const url = await saveImage(file, 'avatar');
    db.prepare('UPDATE users SET avatarUrl = ? WHERE id = ?').run(url, user.id);
    return ok({ avatarUrl: url });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Avatar upload failed');
  }
}
