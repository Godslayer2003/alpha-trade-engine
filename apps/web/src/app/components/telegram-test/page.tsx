'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { fetchTelegramStatus, sendTelegramTestMessage, type TelegramStatus } from '@/lib/api-client';

const CARD = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md dark:shadow-2xl';

export default function TelegramTestPage() {
  const { token, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setStatus(await fetchTelegramStatus(token));
    } catch {
      // Best-effort — the Run button below stays disabled if this fails.
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function run() {
    if (!token || running) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      await sendTelegramTestMessage(token);
      setResult('Sent! Check your linked Telegram chat.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 p-6 max-w-2xl mx-auto">
      <Link href="/components" className="text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 underline">
        ← Components
      </Link>
      <h1 className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1 mb-1">Telegram Test Message</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
        Tool component — sends a single one-off message to your linked Telegram chat, to prove the connection works before
        relying on it for daily reports or workflow results.
      </p>

      <div className={`${CARD} space-y-4`}>
        {authLoading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : !token ? (
          <p className="text-xs text-slate-500">Sign in to use this component.</p>
        ) : (
          <>
            <p className="text-sm">
              Telegram link status:{' '}
              {status?.linked ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Linked ✓</span>
              ) : (
                <span className="text-slate-500">
                  Not linked —{' '}
                  <Link href="/settings" className="underline text-emerald-600 dark:text-emerald-400">
                    connect Telegram in Settings
                  </Link>{' '}
                  first.
                </span>
              )}
            </p>

            <button
              onClick={run}
              disabled={running || !status?.linked}
              className="text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium"
            >
              {running ? 'Sending…' : '▶ Run'}
            </button>

            {result && <p className="text-xs text-emerald-600 dark:text-emerald-400">{result}</p>}
            {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
          </>
        )}

        <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">How to get a Telegram bot token</p>
          <ol className="text-xs text-slate-500 list-decimal list-inside space-y-0.5">
            <li>
              Open Telegram and message{' '}
              <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="underline text-emerald-600 dark:text-emerald-400">
                @BotFather
              </a>
              .
            </li>
            <li>
              Send <code>/newbot</code> and follow the prompts to name your bot.
            </li>
            <li>BotFather replies with a token — copy it into the server's `TELEGRAM_BOT_TOKEN` environment variable.</li>
            <li>Restart the API, then link your own account from the Settings page and come back here to test it.</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
