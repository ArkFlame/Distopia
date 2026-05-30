'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'login' | 'register';

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await response.json();
    setLoading(false);
    if (!json.ok) {
      setError(json.error || 'Request failed');
      return;
    }
    router.push('/app');
  }

  return (
    <main className="shell-bg home">
      <section className="hero">
        <div className="logo-word"><span className="logo-mark"><img src="/assets/brand/distopia-app-icon.webp" alt="" /></span> Distopia</div>
        <h1>Compact community chat. No bloat.</h1>
        <p>
          Self-contained servers, channels, friends, profile themes, image uploads, webhooks, privacy toggles, and visible cooldowns. Built as a distinct modern alternative, not a third-party client for another platform.
        </p>
        <div className="pill-row">
          <span className="pill">SQLite local</span>
          <span className="pill">Custom themes</span>
          <span className="pill">Image uploads</span>
          <span className="pill">Webhooks</span>
          <span className="pill">Quiet limits</span>
          <span className="pill">Server invites</span>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-tabs">
          <button className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')} type="button">Login</button>
          <button className={`tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')} type="button">Create</button>
        </div>
        <form onSubmit={submit}>
          {mode === 'register' && (
            <label className="field">
              <span>Display name</span>
              <input className="input" name="displayName" minLength={2} maxLength={32} required placeholder="Nova Builder" />
            </label>
          )}
          <label className="field">
            <span>Username</span>
            <input className="input" name="username" minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]+" required placeholder="owner" />
          </label>
          <label className="field">
            <span>Password</span>
            <input className="input" name="password" type="password" minLength={8} maxLength={128} required placeholder="owner12345" />
          </label>
          <p className="error">{error}</p>
          <button className="primary" disabled={loading} type="submit">{loading ? 'Working...' : mode === 'login' ? 'Enter Distopia' : 'Create account'}</button>
        </form>
      </section>
    </main>
  );
}
