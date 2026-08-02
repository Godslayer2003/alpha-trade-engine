'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export function AuthPanel() {
  const { user, loading, login, register, logout } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;

  if (user) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-600 dark:text-slate-400">{user.email}</span>
        <button
          onClick={logout}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
        >
          Log out
        </button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, acceptedTerms);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-end gap-1.5 text-sm">
      <div className="flex items-center gap-2">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 text-xs w-40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password (8+ chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 text-xs w-36 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
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
        <label className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer">
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
          — not financial advice, I trade at my own risk.
        </label>
      )}
    </form>
  );
}
