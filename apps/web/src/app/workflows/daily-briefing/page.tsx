'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { runWorkflow } from '@/lib/api-client';

const CARD = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md dark:shadow-2xl';

export default function DailyBriefingWorkflowPage() {
  const { token, loading: authLoading } = useAuth();
  const [running, setRunning] = useState(false);
  const [sent, setSent] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [ran, setRan] = useState(false);

  async function run() {
    if (!token || running) return;
    setRunning(true);
    setRan(false);
    try {
      const result = await runWorkflow(token, 'daily-briefing');
      setSent(result.sent);
      setErrors(result.errors);
    } catch (err) {
      setSent([]);
      setErrors([(err as Error).message]);
    } finally {
      setRunning(false);
      setRan(true);
    }
  }

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 p-6 max-w-2xl mx-auto">
      <Link href="/workflows" className="text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 underline">
        ← Workflows
      </Link>
      <h1 className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1 mb-1">Daily Portfolio Briefing</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
        Fetches your current cash balance, total value, holdings, and best/worst trade, then sends it via whichever
        notification channels you've enabled in Settings. Runs automatically once a day via cron — this button runs it
        immediately, on demand.
      </p>

      <div className={`${CARD} space-y-4`}>
        {authLoading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : !token ? (
          <p className="text-xs text-slate-500">Sign in to run this workflow.</p>
        ) : (
          <>
            <button
              onClick={run}
              disabled={running}
              className="text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium"
            >
              {running ? 'Running…' : '▶ Run'}
            </button>

            {ran && (
              <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-3 text-sm space-y-1">
                {sent.length > 0 && <p className="text-emerald-600 dark:text-emerald-400">Sent via {sent.join(', ')}.</p>}
                {errors.length > 0 && (
                  <p className="text-rose-600 dark:text-rose-400">
                    {sent.length > 0 ? 'Some channels failed: ' : 'Nothing was sent: '}
                    {errors.join('; ')}
                  </p>
                )}
                {sent.length === 0 && errors.length === 0 && (
                  <p className="text-slate-500">
                    No channels are configured — enable Telegram and/or Email in{' '}
                    <Link href="/settings" className="underline text-emerald-600 dark:text-emerald-400">
                      Settings
                    </Link>
                    .
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
          <p className="text-xs text-slate-500">
            Tip: you can also trigger this from the AI Guide chat by typing something like <em>&ldquo;run my daily
            briefing&rdquo;</em> — it recognizes the request and runs this same workflow.
          </p>
        </div>
      </div>
    </main>
  );
}
