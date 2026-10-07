'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { MfaEnrollment } from './MfaEnrollment';

export function AccountSecurityPanel() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState('');
  if (!user) return null;

  async function submit(action: 'password' | 'logout-all') {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/backend/api/v1/auth/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'password' ? { currentPassword, newPassword, otp: otp || undefined } : {}),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || 'Could not update account security.');
      }
      window.location.assign('/dashboard');
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  return <section className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
    <h2 className="text-lg font-semibold">Account security</h2>
    <button type="button" disabled={busy} className="mt-3 text-sm text-emerald-600 underline dark:text-emerald-400"
      onClick={async () => {
        setBusy(true); setError(null);
        try {
          const response = await fetch('/backend/api/v1/auth/verification', { method: 'POST' });
          const body = await response.json();
          if (!response.ok) throw new Error(body.message || 'Could not send verification email.');
          setVerificationMessage(body.message);
        } catch (err) { setError((err as Error).message); }
        finally { setBusy(false); }
      }}>Verify email address</button>
    {verificationMessage && <p role="status" className="mt-2 text-sm text-slate-500">{verificationMessage}</p>}
    <p className="mt-2 text-sm text-slate-500">Changing your password signs you out on every device.</p>
    <form className="mt-4 max-w-md space-y-3" onSubmit={e => { e.preventDefault(); void submit('password'); }}>
      <label className="block text-sm">Current password<input type="password" required autoComplete="current-password"
        value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
        className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent p-2 dark:border-slate-700" /></label>
      <label className="block text-sm">New password<input type="password" required minLength={12} maxLength={72} autoComplete="new-password"
        value={newPassword} onChange={e => setNewPassword(e.target.value)}
        className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent p-2 dark:border-slate-700" /></label>
      <p className="text-xs text-slate-500">Use at least 12 characters. Unicode passwords must fit within 72 UTF-8 bytes.</p>
      <label className="block text-sm">Authenticator or recovery code (required if MFA is enabled)<input type="text" maxLength={32} autoComplete="one-time-code"
        value={otp} onChange={e => setOtp(e.target.value.trim())}
        className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent p-2 dark:border-slate-700" /></label>
      <button disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50">Change password</button>
    </form>
    <button type="button" disabled={busy} onClick={() => void submit('logout-all')}
      className="mt-5 rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-slate-700">Sign out on all devices</button>
    {error && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    <MfaEnrollment />
  </section>;
}
