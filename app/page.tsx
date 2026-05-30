'use client';

import { FormEvent, useMemo, useState } from 'react';

type Mode = 'login' | 'register';
type AuthResponse = { ok: boolean; error?: string; data?: unknown };

const popularDomains = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com', 'yahoo.com', 'ymail.com', 'rocketmail.com',
  'proton.me', 'protonmail.com', 'aol.com', 'zoho.com', 'mail.com', 'gmx.com', 'gmx.net',
  'hey.com', 'fastmail.com', 'tutanota.com', 'tuta.com'
]);

async function parseAuthResponse(response: Response): Promise<AuthResponse> {
  const text = await response.text();
  if (!text) return { ok: response.ok, error: response.ok ? undefined : `HTTP ${response.status}` };
  try {
    const json = JSON.parse(text) as AuthResponse;
    return { ok: Boolean(json.ok), error: json.error, data: json.data };
  } catch {
    return { ok: false, error: text.slice(0, 320) || `HTTP ${response.status}` };
  }
}

function normalizeInput(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function validatePopularEmail(email: string): string | null {
  const lower = email.toLowerCase();
  if (lower.length < 6) return 'Email is too short.';
  if (lower.length > 254) return 'Email is too long.';
  if ((lower.match(/@/g) || []).length !== 1) return 'Email must contain one @.';
  const [local, domain] = lower.split('@');
  if (!local || !domain) return 'Email is invalid.';
  if (local.length > 64) return 'Email handle is too long.';
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return 'Email handle is invalid.';
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return 'Email handle has invalid characters.';
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return 'Email domain is invalid.';
  if (!popularDomains.has(domain)) return 'Use Gmail, Outlook, Hotmail, iCloud, Yahoo, Proton, Zoho, GMX, Mail.com, HEY, Fastmail, or Tuta.';
  return null;
}

function validateForm(mode: Mode, form: FormData): string | null {
  const password = normalizeInput(form.get('password'));
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password is too long.';

  if (mode === 'login') {
    const identifier = normalizeInput(form.get('identifier'));
    if (identifier.length < 3) return 'Enter your username or email.';
    return null;
  }

  const email = normalizeInput(form.get('email'));
  const emailError = validatePopularEmail(email);
  if (emailError) return emailError;

  const username = normalizeInput(form.get('username')).toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(username)) return 'Username must be 3-24 chars using a-z, 0-9, underscore only.';

  const displayName = normalizeInput(form.get('displayName'));
  if (displayName.length < 2 || displayName.length > 32) return 'Display name must be 2-32 characters.';
  return null;
}

async function verifySession(): Promise<boolean> {
  try {
    const response = await fetch('/api/me', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) return false;
    const json = await response.json() as { ok?: boolean };
    return Boolean(json.ok);
  } catch {
    return false;
  }
}

export default function HomePage() {
  const [mode, setMode] = useState<Mode>('login');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const actionLabel = useMemo(() => mode === 'login' ? 'Enter Distopia' : 'Create account', [mode]);

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError('');
    setStatus('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const form = new FormData(event.currentTarget);
    const validationError = validateForm(mode, form);
    if (validationError) {
      setError(validationError);
      setStatus('');
      return;
    }

    setLoading(true);
    setError('');
    setStatus(mode === 'login' ? 'Logging in...' : 'Creating account...');

    try {
      const payload = Object.fromEntries(Array.from(form.entries()).map(([key, value]) => [key, normalizeInput(value)]));
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await parseAuthResponse(response);
      if (!response.ok || !json.ok) {
        setStatus('');
        setError(json.error || 'Request failed. Check the fields and try again.');
        return;
      }

      setStatus('Session created. Opening app...');
      const authenticated = await verifySession();
      if (!authenticated) {
        setStatus('');
        setError('Account was created, but the browser did not store the session cookie. For local LAN testing use http://localhost:3928 or set DISTOPIA_SECURE_COOKIES=auto/false. For public production use HTTPS and proxy X-Forwarded-Proto: https.');
        return;
      }
      window.location.assign('/app');
    } catch (requestError) {
      setStatus('');
      setError(requestError instanceof Error ? requestError.message : 'Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell-bg home">
      <section className="hero">
        <div className="logo-word"><span className="logo-mark"><img src="/assets/brand/distopia-app-icon.webp" alt="" /></span> Distopia</div>
        <h1>Compact community chat. No bloat.</h1>
        <p>
          Self-contained servers, channels, friends, profile themes, image/ZIP uploads, webhooks, privacy toggles, direct messages, and Distopia AI. Built as a distinct modern alternative, not a third-party client for another platform.
        </p>
        <div className="pill-row">
          <span className="pill">SQLite local</span>
          <span className="pill">Custom themes</span>
          <span className="pill">8 MB uploads</span>
          <span className="pill">Webhooks</span>
          <span className="pill">Distopia AI</span>
          <span className="pill">Server invites</span>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-tabs">
          <button className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => switchMode('login')} type="button">Login</button>
          <button className={`tab ${mode === 'register' ? 'active' : ''}`} onClick={() => switchMode('register')} type="button">Register</button>
        </div>
        <form onSubmit={submit} noValidate>
          {mode === 'register' && (
            <>
              <label className="field">
                <span>Email</span>
                <input className="input" name="email" type="email" inputMode="email" autoComplete="email" minLength={6} maxLength={254} required placeholder="you@gmail.com" />
              </label>
              <p className="field-help">Supported providers: Gmail, Outlook, Hotmail, iCloud, Yahoo, Proton, Zoho, GMX, Mail.com, HEY, Fastmail, Tuta.</p>
              <label className="field">
                <span>Display name</span>
                <input className="input" name="displayName" autoComplete="name" minLength={2} maxLength={32} required placeholder="Nova Builder" />
              </label>
            </>
          )}
          <label className="field">
            <span>{mode === 'login' ? 'Username or email' : 'Username'}</span>
            <input
              className="input"
              name={mode === 'login' ? 'identifier' : 'username'}
              minLength={3}
              maxLength={mode === 'login' ? 254 : 24}
              pattern={mode === 'register' ? '[a-zA-Z0-9_]+' : undefined}
              autoComplete={mode === 'login' ? 'username' : 'username'}
              required
              placeholder={mode === 'login' ? 'your_name or you@gmail.com' : 'your_name'}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input className="input" name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} maxLength={128} required placeholder="minimum 8 characters" />
          </label>
          <p className="status-line" role="status" aria-live="polite">{status}</p>
          <p className="error" role="alert" aria-live="assertive">{error}</p>
          <button className="primary" disabled={loading} aria-busy={loading} type="submit">{loading ? 'Working...' : actionLabel}</button>
        </form>
      </section>
    </main>
  );
}
