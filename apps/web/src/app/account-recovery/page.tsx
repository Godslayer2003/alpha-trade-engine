'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AccountRecoveryPage() {
  const [mode, setMode] = useState<'request' | 'reset' | 'verify'>('request');
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    for (const action of ['reset', 'verify'] as const) {
      const value = fragment.get(action);
      if (value) { setMode(action); setToken(value); }
    }
    // Remove the secret from the address bar and browser history after reading it.
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  async function submit() {
    setBusy(true); setError('');
    try {
      const route = { request: 'recovery', reset: 'reset-password', verify: 'verify-email' }[mode];
      const response = await fetch(`/backend/api/v1/auth/${route}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'request' ? { email } : mode === 'reset' ? { token, password } : { token }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Could not complete this request.');
      setMessage(mode === 'request' ? body.message : mode === 'reset' ? 'Password changed. Sign in again; MFA remains enabled.' : 'Email verified.');
      setToken(''); setPassword('');
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-md px-6 py-16 text-slate-900 dark:text-slate-100">
    <Link href="/dashboard" className="text-sm text-emerald-600 dark:text-emerald-400">← Dashboard</Link>
    <h1 className="mt-6 text-2xl font-semibold">{mode === 'verify' ? 'Verify your email' : 'Account recovery'}</h1>
    {message ? <p role="status" className="mt-5 text-sm">{message}</p> : <form className="mt-6 space-y-4" onSubmit={e => { e.preventDefault(); void submit(); }}>
      {mode === 'request' && <label className="block text-sm">Email address<input type="email" required autoComplete="email"
        value={email} onChange={e => setEmail(e.target.value)} className="mt-2 block w-full rounded-lg border bg-transparent p-3 dark:border-slate-700" /></label>}
      {mode === 'reset' && <label className="block text-sm">New password<input type="password" required minLength={12} maxLength={72} autoComplete="new-password"
        value={password} onChange={e => setPassword(e.target.value)} className="mt-2 block w-full rounded-lg border bg-transparent p-3 dark:border-slate-700" /></label>}
      <button disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50">{mode === 'request' ? 'Send recovery email' : mode === 'reset' ? 'Change password' : 'Verify email'}</button>
    </form>}
    {error && <p role="alert" className="mt-4 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
  </main>;
}
