import fs from 'node:fs/promises';
import path from 'node:path';
import { absoluteFromRoot, env } from '@/lib/env';
import { fail } from '@/lib/http';

export const runtime = 'nodejs';

const allowedKinds = new Set(['messages', 'user-avatars', 'misc']);
const contentTypes = new Map([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp']
]);

export async function GET(_request: Request, ctx: { params: Promise<{ kind: string; name: string }> }) {
  try {
    const { kind, name } = await ctx.params;
    if (!allowedKinds.has(kind)) return fail('CDN bucket not found', 404);
    if (!/^[a-z0-9_-]+-[0-9]+-[A-Za-z0-9]+\.(png|jpg|jpeg|gif|webp)$/i.test(name)) return fail('CDN asset not found', 404);
    const root = path.resolve(absoluteFromRoot(env.uploadDir));
    const target = path.resolve(root, kind, name);
    if (!target.startsWith(`${root}${path.sep}`)) return fail('CDN asset not found', 404);
    const ext = path.extname(target).toLowerCase();
    const contentType = contentTypes.get(ext);
    if (!contentType) return fail('CDN asset not found', 404);
    const bytes = await fs.readFile(target);
    return new Response(new Uint8Array(bytes), {
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff'
      }
    });
  } catch {
    return fail('CDN asset not found', 404);
  }
}
