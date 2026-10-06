'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export function DataPrivacyPanel() {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  if (!user) return null;
  async function act(action: 'export' | 'delete' | 'picture') {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/backend/api/v1/account${action === 'delete' ? '' : `/${action}`}`, {
        method: action === 'export' ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'picture' ? undefined : JSON.stringify({ password, otp: otp || undefined, ...(action === 'delete' ? { confirmation } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(' ') : data.message || 'Request failed. Try again.');
      if (action === 'delete') { window.location.assign('/dashboard'); return; }
      if (action === 'export') {
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url; link.download = 'alpha-trade-data.json'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage('Your account data has been downloaded. Keep this file private.');
      } else { setMessage('Profile picture removed. Reload this page to refresh the preview.'); }
      setPassword(''); setOtp('');
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  const input = 'mt-1 block w-full rounded-lg border border-slate-300 bg-transparent p-2 dark:border-slate-700';
  return <section className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
    <h2 className="text-lg font-semibold">Your data</h2>
    <p className="mt-2 text-sm">Download your account records or permanently delete your account. <a href="/privacy" className="underline">Read the privacy policy</a>.</p>
    <button type="button" disabled={busy} onClick={() => void act('picture')} className="my-4 rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Remove profile picture</button>
    <form className="max-w-md space-y-3" onSubmit={event => { event.preventDefault(); void act('export'); }}>
      <label className="block text-sm">Current password<input className={input} type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={event => setPassword(event.target.value)} /></label>
      <label className="block text-sm">Authenticator or recovery code (if enabled)<input className={input} autoComplete="one-time-code" maxLength={32} value={otp} onChange={event => setOtp(event.target.value)} /></label>
      <button disabled={busy} className="rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-50">Download my data</button>
      <details className="rounded-lg border border-rose-300 p-3 dark:border-rose-900">
        <summary className="cursor-pointer font-medium">Delete account permanently</summary>
        <p className="my-3 text-sm">This removes your profile, picture, portfolios, strategies, saved analyses, linked accounts, feedback and sessions. You lose paid chat access. Payment provider records and hosting backups may remain under their own retention policies. This cannot be undone.</p>
        <label className="block text-sm">Type DELETE to confirm<input className={input} value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
        <button type="button" disabled={busy || confirmation !== 'DELETE' || !password} onClick={() => void act('delete')} className="mt-3 rounded-lg bg-rose-700 px-4 py-2 text-white disabled:opacity-50">Permanently delete my account</button>
      </details>
    </form>
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
  </section>;
}
