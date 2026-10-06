'use client';
import { useState } from 'react';

export function MfaEnrollment() {
  const [password, setPassword] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function enroll(action: 'setup' | 'confirm') {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/backend/api/v1/auth/mfa/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'setup' ? { password } : { code }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'MFA enrollment failed.');
      setPassword('');
      if (action === 'setup') setSecret(body.secret);
      else { setSecret(''); setCode(''); setRecoveryCodes(body.recoveryCodes); }
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
    <h3 className="font-medium">Authenticator MFA</h3>
    <p className="mt-2 text-sm text-slate-500">Required for administrator actions. Add Alpha Trade to your authenticator app using the setup key.</p>
    {recoveryCodes.length > 0 ? <div className="mt-4">
      <p className="text-sm">MFA is enabled. Save these single-use recovery codes in your password manager before leaving this page.</p>
      <div className="my-3 grid gap-1 overflow-x-auto font-mono text-xs sm:grid-cols-2">{recoveryCodes.map(item => <code key={item}>{item}</code>)}</div>
      <a href="/dashboard" className="text-sm text-emerald-600 dark:text-emerald-400">Codes saved — sign in again</a>
    </div> : <form className="mt-3 max-w-md space-y-3" onSubmit={e => { e.preventDefault(); void enroll(secret ? 'confirm' : 'setup'); }}>
      {secret ? <>
        <p className="text-xs text-slate-500">Keep this key private. Store it in your authenticator app, then enter a generated code.</p>
        <code className="block break-all rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-900">{secret}</code>
        <label className="block text-sm">Authenticator code<input type="text" inputMode="numeric" pattern="[0-9]{6}" required autoComplete="one-time-code"
          value={code} onChange={e => setCode(e.target.value)} className="mt-1 block w-full rounded-lg border bg-transparent p-2 dark:border-slate-700" /></label>
      </> : <label className="block text-sm">Confirm your password<input type="password" required autoComplete="current-password"
        value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full rounded-lg border bg-transparent p-2 dark:border-slate-700" /></label>}
      <button disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-slate-700">{secret ? 'Enable MFA' : 'Set up MFA'}</button>
    </form>}
    {error && <p role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
  </div>;
}
