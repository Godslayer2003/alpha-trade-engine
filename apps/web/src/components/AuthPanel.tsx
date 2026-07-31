'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createTelegramLinkCode } from '@/lib/api-client';

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

function ConnectTelegramButton() {
  const { token } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setCode(await createTelegramLinkCode(token));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (code) {
    const deepLink = TELEGRAM_BOT_USERNAME
      ? `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}`
      : null;
    return (
      <div className="text-xs text-slate-400">
        {deepLink ? (
          <a href={deepLink} target="_blank" rel="noreferrer" className="text-emerald-400 underline">
            Open Telegram to finish linking
          </a>
        ) : (
          <span>
            In Telegram, message the bot: <code className="text-emerald-400">/link {code}</code>
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200"
    >
      {loading ? 'Generating…' : 'Connect Telegram'}
      {error && <span className="ml-2 text-rose-400">{error}</span>}
    </button>
  );
}

export function AuthPanel() {
  const { user, loading, login, register, logout } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;

  if (user) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-400">{user.email}</span>
        <ConnectTelegramButton />
        <button
          onClick={logout}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
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
      else await register(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 text-sm">
      <input
        type="email"
        required
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-lg bg-slate-800 border border-slate-700 text-slate-100 px-2.5 py-1.5 text-xs w-40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <input
        type="password"
        required
        minLength={8}
        placeholder="Password (8+ chars)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-lg bg-slate-800 border border-slate-700 text-slate-100 px-2.5 py-1.5 text-xs w-36 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <button
        type="submit"
        disabled={submitting}
        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white whitespace-nowrap"
      >
        {mode === 'login' ? 'Log in' : 'Sign up'}
      </button>
      <button
        type="button"
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        className="text-xs text-slate-500 hover:text-slate-300 underline whitespace-nowrap"
      >
        {mode === 'login' ? 'Need an account?' : 'Have an account?'}
      </button>
      {error && <span className="text-xs text-rose-400">{error}</span>}
    </form>
  );
}
