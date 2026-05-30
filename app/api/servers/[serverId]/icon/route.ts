import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok } from '@/lib/http';
import { isServerAdmin } from '@/lib/queries';
import { saveUpload } from '@/lib/upload';

export const runtime = 'nodejs';

export async function POST(request: Request, ctx: { params: Promise<{ serverId: string }> }) {
  try {
    const user = await requireUser();
    const { serverId } = await ctx.params;
    if (!isServerAdmin(user.id, serverId)) return fail('Server admin required', 403);
    const form = await request.formData();
    const file = form.get('icon');
    if (!(file instanceof File)) return fail('Missing server icon');
    const saved = await saveUpload(file, 'server', { allowImages: true, allowZip: false });
    db.prepare('UPDATE servers SET iconUrl = ? WHERE id = ?').run(saved.url, serverId);
    return ok({ iconUrl: saved.url });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Server icon upload failed');
  }
}
