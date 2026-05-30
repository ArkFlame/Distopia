import { requireUser, sanitizeUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, ok, readJson } from '@/lib/http';
import { boolInt, clampText } from '@/lib/utils';
import { isPremadeAvatarUrl } from '@/lib/avatar';

export const runtime = 'nodejs';

const allowedThemes = new Set(['obsidian', 'neon', 'ember', 'forest', 'mono', 'aurora']);
const allowedFonts = new Set(['Inter', 'JetBrains Mono', 'Neon Pulse', 'Cyber Grid', 'Arcade', 'Terminal', 'Elegant Serif', 'Street Bold', 'Rounded Soft', 'Georgia', 'Trebuchet MS', 'Verdana', 'Courier New', 'Impact', 'Comic Sans MS', 'Brush Script MT', 'Times New Roman']);

export async function GET() {
  try {
    const user = await requireUser();
    return ok({ user: sanitizeUser(user) });
  } catch {
    return fail('Not authenticated', 401);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson(request);
    const displayName = clampText(body.displayName ?? user.displayName, 2, 32, 'displayName');
    const bio = typeof body.bio === 'string' ? body.bio.trim().slice(0, 180) : user.bio;
    const theme = typeof body.theme === 'string' && allowedThemes.has(body.theme) ? body.theme : user.theme;
    const font = typeof body.font === 'string' && allowedFonts.has(body.font) ? body.font : user.font;
    const nameColor = typeof body.nameColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(body.nameColor) ? body.nameColor : user.nameColor;
    const allowFriendRequests = boolInt(body.allowFriendRequests);
    const allowServerInvites = boolInt(body.allowServerInvites);
    const avatarUrl = isPremadeAvatarUrl(body.avatarPreset) ? body.avatarPreset : user.avatarUrl;
    db.prepare('UPDATE users SET displayName = ?, bio = ?, theme = ?, nameColor = ?, font = ?, avatarUrl = ?, allowFriendRequests = ?, allowServerInvites = ? WHERE id = ?')
      .run(displayName, bio, theme, nameColor, font, avatarUrl, allowFriendRequests, allowServerInvites, user.id);
    return ok({ saved: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Profile update failed');
  }
}
