const POPULAR_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'yahoo.com',
  'ymail.com',
  'rocketmail.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
  'zoho.com',
  'mail.com',
  'gmx.com',
  'gmx.net',
  'hey.com',
  'fastmail.com',
  'tutanota.com',
  'tuta.com'
]);

export function normalizePopularEmail(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Email is required');
  const email = value.trim().toLowerCase();
  if (email.length < 6) throw new Error('Email is too short');
  if (email.length > 254) throw new Error('Email is too long');
  if ((email.match(/@/g) || []).length !== 1) throw new Error('Email must contain one @');

  const [local, domain] = email.split('@');
  if (!local || !domain) throw new Error('Email is invalid');
  if (local.length > 64) throw new Error('Email handle is too long');
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) throw new Error('Email handle is invalid');
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) throw new Error('Email handle has invalid characters');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) throw new Error('Email domain is invalid');
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) throw new Error('Email domain is invalid');
  if (!POPULAR_EMAIL_DOMAINS.has(domain)) {
    throw new Error('Use a valid email from a supported provider: Gmail, Outlook, Hotmail, iCloud, Yahoo, Proton, Zoho, GMX, Mail.com, HEY, Fastmail, or Tuta');
  }
  return email;
}

export function isEmailLike(value: string): boolean {
  return value.includes('@');
}
