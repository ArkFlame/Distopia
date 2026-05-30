import path from 'node:path';

const secureCookieRaw = (process.env.DISTOPIA_SECURE_COOKIES || 'auto').trim().toLowerCase();

export const env = {
  appUrl: process.env.DISTOPIA_APP_URL || 'https://distopia.arkflame.com',
  port: Number(process.env.DISTOPIA_PORT || 3928),
  dbPath: process.env.DISTOPIA_DB_PATH || './data/distopia.db',
  uploadDir: process.env.DISTOPIA_UPLOAD_DIR || './data/cdn',
  maxUploadBytes: Number(process.env.DISTOPIA_MAX_UPLOAD_BYTES || 8 * 1024 * 1024),
  maxImageUploadBytes: Number(process.env.DISTOPIA_MAX_IMAGE_UPLOAD_BYTES || 8 * 1024 * 1024),
  maxZipUploadBytes: Number(process.env.DISTOPIA_MAX_ZIP_UPLOAD_BYTES || 8 * 1024 * 1024),
  cookieName: process.env.DISTOPIA_COOKIE_NAME || 'distopia_session',
  secureCookiesMode: secureCookieRaw,
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  openRouterModel: process.env.DISTOPIA_AI_MODEL || 'openrouter/free'
};

export function absoluteFromRoot(relativeOrAbsolute: string): string {
  if (path.isAbsolute(relativeOrAbsolute)) return relativeOrAbsolute;
  return path.join(/* turbopackIgnore: true */ process.cwd(), relativeOrAbsolute);
}
