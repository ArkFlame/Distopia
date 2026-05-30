import fs from 'node:fs';

const requiredFiles = [
  'app/api/auth/register/route.ts',
  'lib/email.ts',
  'app/api/servers/[serverId]/icon/route.ts',
  'app/api/channels/[channelId]/route.ts',
  'app/api/messages/[messageId]/route.ts',
  'app/api/messages/[messageId]/history/route.ts',
  'app/api/direct-conversations/route.ts',
  'app/api/direct-conversations/[conversationId]/messages/route.ts',
  'public/assets/brand/distopia-app-icon.webp',
  'public/assets/brand/distopia-app-icon-64.webp',
  'public/assets/premade-avatars/distopia-avatar-1.webp',
  'public/assets/icons/pen.svg',
  'public/assets/icons/trash.svg',
  'public/favicon.ico',
  'scripts/dev-linux.sh',
  'scripts/dev-linux-yarn.sh'
];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
}
const db = fs.readFileSync('lib/db.ts', 'utf8');
for (const token of ['CREATE TABLE IF NOT EXISTS direct_conversations', 'CREATE TABLE IF NOT EXISTS direct_messages', 'DISTOPIA_AI_USER_ID', 'description TEXT NOT NULL DEFAULT', 'CREATE TABLE IF NOT EXISTS message_edits', 'email TEXT NOT NULL DEFAULT', 'emailVerified INTEGER NOT NULL DEFAULT', 'idx_users_email_lower']) {
  if (!db.includes(token)) throw new Error(`Schema token missing: ${token}`);
}
const client = fs.readFileSync('components/AppClient.tsx', 'utf8');
for (const token of ['Recent Conversations', 'Online Friends', 'Distopia AI', 'ProfileContextMenu', 'floating-actions', 'openDirectConversation', 'MessageRow', 'DirectMessageRow']) {
  if (!client.includes(token)) throw new Error(`Client token missing: ${token}`);
}
const env = fs.readFileSync('.env.example', 'utf8');
for (const token of ['DISTOPIA_PORT=3928', 'DISTOPIA_APP_URL=https://distopia.arkflame.com', 'OPENROUTER_API_KEY=', 'DISTOPIA_AI_MODEL=openrouter/free', 'DISTOPIA_SECURE_COOKIES=auto']) {
  if (!env.includes(token)) throw new Error(`Env token missing: ${token}`);
}
const seed = fs.readFileSync('scripts/seed.ts', 'utf8');
if (seed.includes('owner12345') || seed.includes('Distopia Official')) throw new Error('Production seed must not create demo accounts or default server');
const register = fs.readFileSync('app/api/auth/register/route.ts', 'utf8');
if (register.includes('joinOfficialServer')) throw new Error('Register must not auto-join a default server');

const home = fs.readFileSync('app/page.tsx', 'utf8');
for (const token of ['name="email"', 'Username or email', 'parseAuthResponse', 'window.location.assign', 'verifySession', 'noValidate', "credentials: \'same-origin\'"]) {
  if (!home.includes(token)) throw new Error(`Auth page token missing: ${token}`);
}
const emailHelper = fs.readFileSync('lib/email.ts', 'utf8');
for (const token of ['normalizePopularEmail', 'POPULAR_EMAIL_DOMAINS', 'gmail.com', 'outlook.com', 'proton.me']) {
  if (!emailHelper.includes(token)) throw new Error(`Email helper token missing: ${token}`);
}
const login = fs.readFileSync('app/api/auth/login/route.ts', 'utf8');
for (const token of ['identifier', 'lower(email)', 'Invalid username/email or password']) {
  if (!login.includes(token)) throw new Error(`Login token missing: ${token}`);
}
const auth = fs.readFileSync('lib/auth.ts', 'utf8');
for (const token of ['shouldUseSecureCookie', 'isLocalOrPrivateHost', 'secure: shouldUseSecureCookie(request)']) {
  if (!auth.includes(token)) throw new Error(`Cookie auth token missing: ${token}`);
}

const nextConfig = fs.readFileSync('next.config.ts', 'utf8');
for (const token of ['allowedDevOrigins', 'DISTOPIA_DEV_ORIGINS', 'configuredDevOrigins']) {
  if (!nextConfig.includes(token)) throw new Error(`Next config token missing: ${token}`);
}
const runLinux = fs.readFileSync('scripts/run-linux.sh', 'utf8');
for (const token of ['Building production bundle', 'No Next.js dev HMR websocket', 'run_pnpm start']) {
  if (!runLinux.includes(token)) throw new Error(`run-linux production token missing: ${token}`);
}
const devLinux = fs.readFileSync('scripts/dev-linux.sh', 'utf8');
for (const token of ['DISTOPIA_DEV_ORIGINS', 'Allowed dev origins', 'run_pnpm dev']) {
  if (!devLinux.includes(token)) throw new Error(`dev-linux token missing: ${token}`);
}
const runLinuxYarn = fs.readFileSync('scripts/run-linux-yarn.sh', 'utf8');
for (const token of ['Building production bundle', 'No Next.js dev HMR websocket', 'yarn start']) {
  if (!runLinuxYarn.includes(token)) throw new Error(`run-linux-yarn production token missing: ${token}`);
}
const devLinuxYarn = fs.readFileSync('scripts/dev-linux-yarn.sh', 'utf8');
for (const token of ['DISTOPIA_DEV_ORIGINS', 'Allowed dev origins', 'yarn dev']) {
  if (!devLinuxYarn.includes(token)) throw new Error(`dev-linux-yarn token missing: ${token}`);
}
console.log('Static production check passed.');
