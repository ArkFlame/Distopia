import fs from 'node:fs/promises';
import path from 'node:path';
import { absoluteFromRoot, env } from './env';
import { inviteCode } from './utils';

export type SavedUpload = {
  url: string;
  name: string;
  mime: string;
  size: number;
  kind: 'image' | 'zip';
};

const imageTypes = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/gif', '.gif'],
  ['image/webp', '.webp']
]);
const imageExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
const zipTypes = new Set(['application/zip', 'application/x-zip-compressed', 'application/octet-stream']);

export async function saveImage(file: File, prefix: string): Promise<string> {
  const saved = await saveUpload(file, prefix, { allowImages: true, allowZip: false });
  return saved.url;
}

export async function saveUpload(file: File, prefix: string, options: { allowImages: boolean; allowZip: boolean }): Promise<SavedUpload> {
  if (file.size <= 0) throw new Error('Empty upload');
  const originalName = safeOriginalName(file.name || 'upload');
  const lowerExt = path.extname(originalName).toLowerCase();
  const normalizedMime = normalizeMime(file.type, lowerExt);
  const imageExt = imageTypes.get(normalizedMime) || (imageExts.has(lowerExt) ? normalizeImageExt(lowerExt) : '');
  const isImage = Boolean(imageExt);
  const isZip = lowerExt === '.zip' && zipTypes.has(normalizedMime);

  if (isImage && !options.allowImages) throw new Error('Images are not allowed here');
  if (isZip && !options.allowZip) throw new Error('ZIP files are not allowed here');
  if (!isImage && !isZip) throw new Error(options.allowZip ? 'Only PNG, JPG, GIF, WEBP, and ZIP files are allowed' : 'Only PNG, JPG, GIF, and WEBP images are allowed');

  const limit = isZip ? env.maxZipUploadBytes : env.maxImageUploadBytes;
  if (file.size > limit) throw new Error(`${isZip ? 'ZIP' : 'Image'} exceeds ${Math.floor(limit / 1024 / 1024)} MB limit`);

  const cdnKind = prefix === 'avatar' ? 'user-avatars' : prefix === 'server' ? 'server-icons' : prefix === 'message' ? 'messages' : 'misc';
  const dir = absoluteFromRoot(path.join(env.uploadDir, cdnKind));
  await fs.mkdir(dir, { recursive: true });
  const ext = isZip ? '.zip' : imageExt;
  const name = `${prefix}-${Date.now()}-${inviteCode(10)}${ext}`;
  const target = path.join(dir, name);
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(target, bytes, { flag: 'wx' });
  return {
    url: `/cdn/${cdnKind}/${name}`,
    name: originalName,
    mime: isZip ? 'application/zip' : normalizedMime,
    size: file.size,
    kind: isZip ? 'zip' : 'image'
  };
}

export async function deleteUploadByUrl(url: string): Promise<void> {
  if (!url.startsWith('/cdn/')) return;
  const parts = url.split('/').filter(Boolean);
  if (parts.length !== 3 || parts[0] !== 'cdn') return;
  const kind = parts[1];
  const name = parts[2];
  if (!['messages', 'user-avatars', 'server-icons', 'misc'].includes(kind)) return;
  if (!/^[a-z0-9_-]+-[0-9]+-[A-Za-z0-9]+\.(png|jpg|jpeg|gif|webp|zip)$/i.test(name)) return;
  const root = path.resolve(absoluteFromRoot(env.uploadDir));
  const target = path.resolve(root, kind, name);
  if (!target.startsWith(`${root}${path.sep}`)) return;
  await fs.unlink(target).catch(() => undefined);
}

function normalizeMime(type: string, ext: string): string {
  if (type) return type.toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.zip') return 'application/zip';
  return 'application/octet-stream';
}

function normalizeImageExt(ext: string): string {
  return ext === '.jpeg' ? '.jpg' : ext;
}

function safeOriginalName(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._ -]/g, '').trim();
  return base.slice(0, 96) || 'upload';
}
