import path from 'node:path';

export const env = {
  appUrl: process.env.DISTOPIA_APP_URL || 'http://localhost:3000',
  dbPath: process.env.DISTOPIA_DB_PATH || './data/distopia.db',
  uploadDir: process.env.DISTOPIA_UPLOAD_DIR || './data/cdn',
  maxUploadBytes: Number(process.env.DISTOPIA_MAX_UPLOAD_BYTES || 8 * 1024 * 1024),
  maxImageUploadBytes: Number(process.env.DISTOPIA_MAX_IMAGE_UPLOAD_BYTES || 8 * 1024 * 1024),
  maxZipUploadBytes: Number(process.env.DISTOPIA_MAX_ZIP_UPLOAD_BYTES || 8 * 1024 * 1024),
  cookieName: process.env.DISTOPIA_COOKIE_NAME || 'distopia_session',
  secureCookies: process.env.DISTOPIA_SECURE_COOKIES === 'true'
};

export function absoluteFromRoot(relativeOrAbsolute: string): string {
  if (path.isAbsolute(relativeOrAbsolute)) return relativeOrAbsolute;
  return path.join(/* turbopackIgnore: true */ process.cwd(), relativeOrAbsolute);
}
