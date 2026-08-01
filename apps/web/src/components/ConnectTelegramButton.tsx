'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createTelegramLinkCode, fetchTelegramStatus } from '@/lib/api-client';

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
const POLL_INTERVAL_MS = 3_000;

export function ConnectTelegramButton() {
  const { token } = useAuth();
  const [linked, setLinked] = useState<boolean | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchTelegramStatus(token)
      .then((status) => setLinked(status.linked))
      .catch(() => setLinked(false));
  }, [token]);

  // Once a code is generated, poll for confirmation so the button flips to
  // "Connected" the moment the user finishes the /start flow in Telegram —
  // there's no webhook back to the browser, so this is the only way to know.
  useEffect(() => {
    if (!token || !code || linked) return;
    const interval = setInterval(() => {
      fetchTelegramStatus(token)
        .then((status) => {
          if (status.linked) setLinked(true);
        })
        .catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [token, code, linked]);

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

  if (linked) {
    return (
      <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ Telegram connected</span>
    );
  }

  if (code) {
    const deepLink = TELEGRAM_BOT_USERNAME
      ? `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}`
      : null;
    return (
      <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
        {deepLink ? (
          <a
            href={deepLink}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-600 dark:text-emerald-400 underline"
          >
            Open Telegram to finish linking
          </a>
        ) : (
          <span>
            In Telegram, message the bot:{' '}
            <code className="text-emerald-600 dark:text-emerald-400">/link {code}</code>
          </span>
        )}
        <p className="text-slate-500">Waiting for confirmation… this updates automatically once linked.</p>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-xs px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-200"
    >
      {loading ? 'Generating…' : 'Connect Telegram'}
      {error && <span className="ml-2 text-rose-600 dark:text-rose-400">{error}</span>}
    </button>
  );
}
