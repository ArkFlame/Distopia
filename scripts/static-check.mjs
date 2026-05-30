import fs from 'node:fs';

const requiredFiles = [
  'app/api/servers/[serverId]/icon/route.ts',
  'app/api/channels/[channelId]/route.ts',
  'app/api/messages/[messageId]/attachment/route.ts',
  'app/api/messages/[messageId]/route.ts',
  'app/api/messages/[messageId]/history/route.ts',
  'public/assets/brand/distopia-app-icon.webp',
  'public/assets/brand/distopia-app-icon-64.webp',
  'public/assets/premade-avatars/distopia-avatar-1.webp',
  'public/favicon.ico'
];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
}
const db = fs.readFileSync('lib/db.ts', 'utf8');
for (const token of ['description TEXT NOT NULL DEFAULT', 'attachmentName TEXT', 'attachmentMime TEXT', 'attachmentSize INTEGER', 'CREATE TABLE IF NOT EXISTS message_edits', 'editedAt TEXT']) {
  if (!db.includes(token)) throw new Error(`Schema token missing: ${token}`);
}
const client = fs.readFileSync('components/AppClient.tsx', 'utf8');
for (const token of ['compressImageFile', 'AttachmentChip', 'MessageAttachment', 'serverSettings', 'channelSettings', 'distopia-app-icon.webp', 'EditHistoryPanel', 'Neon Pulse', 'message-actions']) {
  if (!client.includes(token)) throw new Error(`Client token missing: ${token}`);
}
const upload = fs.readFileSync('lib/upload.ts', 'utf8');
for (const token of ['allowZip', 'server-icons', 'application/zip', 'maxZipUploadBytes']) {
  if (!upload.includes(token)) throw new Error(`Upload token missing: ${token}`);
}
console.log('Static check passed.');
