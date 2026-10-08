'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export function AuthPanel() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const { user, loading, login, register, logout } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && !user) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open, user]);

  if (loading) return <span aria-hidden="true" className="inline-block h-10 w-20" />;

  if (user) {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm">
        <span title={user.email} className="hidden max-w-40 truncate text-slate-600 dark:text-slate-400 xl:inline">{user.email}</span>
        <button
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true);
            setError(null);
            try { await logout(); }
            catch { setError('Logout failed. Try again to end your server session.'); }
            finally { setSubmitting(false); }
          }}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
        >
          Log out
        </button>
        {error && <span role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</span>}
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'login') await login(email, password, otp || undefined);
      else await register(email, password, acceptedTerms);
      setOpen(false);
      setPassword(''); setOtp('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
    <button type="button" onClick={() => setOpen(true)} className="button-primary">Sign in</button>
    <dialog ref={dialog} aria-labelledby="auth-title" onCancel={() => setOpen(false)} onClose={() => setOpen(false)}
      className="w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 backdrop:bg-slate-950/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <div className="mb-5 flex items-center justify-between"><h2 id="auth-title" className="text-xl font-semibold">{mode === 'login' ? 'Welcome back' : 'Create an account'}</h2>
      <button type="button" onClick={() => setOpen(false)} aria-label="Close sign in" className="rounded p-2 text-slate-500">✕</button></div>
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
      <div className="flex flex-col gap-3">
        <input
          type="email"
          aria-label="Email address"
          autoComplete="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <input
          type="password"
          aria-label="Password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          minLength={mode === 'register' ? 12 : 1}
          maxLength={mode === 'register' ? 72 : 128}
          placeholder={mode === 'register' ? 'Password (12+ chars)' : 'Password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {mode === 'login' && <input type="text" aria-label="Authenticator or recovery code" autoComplete="one-time-code"
          placeholder="MFA code (if enabled)" maxLength={32} value={otp} onChange={e => setOtp(e.target.value.trim())}
          className="w-full rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800" />}
        <button
          type="submit"
          disabled={submitting || (mode === 'register' && !acceptedTerms)}
          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white whitespace-nowrap"
        >
          {mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline whitespace-nowrap"
        >
          {mode === 'login' ? 'Need an account?' : 'Have an account?'}
        </button>
        {error && <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>}
      </div>
      {mode === 'register' && (
        <div className="space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
        <label className="flex items-start gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            required
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="accent-emerald-600"
          />
          I have read and agree to the{' '}
          <Link href="/disclaimer" target="_blank" className="underline hover:text-emerald-600 dark:hover:text-emerald-400">
            Disclaimer &amp; Terms
          </Link>{' '}
          — practice trading and educational content.
        </label>
        <p>We store account and security information to provide and protect your account.
          Optional AI prompts and notifications go to their providers.{' '}
          <Link href="/privacy" target="_blank" className="underline">Read the Privacy policy</Link> before signing up.
        </p>
        </div>
      )}
      <Link href="/account-recovery" className="text-xs text-slate-500 underline">Forgot password?</Link>
    </form>
    </dialog>
    </>
  );
}
