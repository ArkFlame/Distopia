const PREMADE_AVATAR_COUNT = 8;
const PREMADE_AVATAR_PREFIX = '/assets/premade-avatars/distopia-avatar-';

export function premadeAvatarUrl(seed: string): string {
  const slot = (hash(seed) % PREMADE_AVATAR_COUNT) + 1;
  return `${PREMADE_AVATAR_PREFIX}${slot}.webp`;
}

export function isPremadeAvatarUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  for (let index = 1; index <= PREMADE_AVATAR_COUNT; index++) {
    if (value === `${PREMADE_AVATAR_PREFIX}${index}.webp`) return true;
  }
  return false;
}

function hash(value: string): number {
  let result = 2166136261;
  for (let i = 0; i < value.length; i++) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}
