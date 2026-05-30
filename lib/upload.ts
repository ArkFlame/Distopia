import fs from 'node:fs/promises';
import path from 'node:path';
import { absoluteFromRoot, env } from './env';
import { inviteCode } from './utils';

const allowed = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/gif', '.gif'],
  ['image/webp', '.webp']
]);

export async function saveImage(file: File, prefix: string): Promise<string> {
  if (file.size <= 0) return '';
  if (file.size > env.maxUploadBytes) throw new Error(`Image exceeds ${Math.floor(env.maxUploadBytes / 1024 / 1024)} MB limit`);
  const ext = allowed.get(file.type);
  if (!ext) throw new Error('Only PNG, JPG, GIF, and WEBP images are allowed');
  const cdnKind = prefix === 'avatar' ? 'user-avatars' : prefix === 'message' ? 'messages' : 'misc';
  const dir = absoluteFromRoot(path.join(env.uploadDir, cdnKind));
  await fs.mkdir(dir, { recursive: true });
  const name = `${prefix}-${Date.now()}-${inviteCode(10)}${ext}`;
  const target = path.join(dir, name);
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(target, bytes, { flag: 'wx' });
  return `/cdn/${cdnKind}/${name}`;
}
