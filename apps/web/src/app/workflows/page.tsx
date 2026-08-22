'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { runWorkflow } from '@/lib/api-client';
import { ComponentStatus } from '@/components/ComponentCard';

const CARD = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md dark:shadow-2xl';

const STATUS_LABEL: Record<ComponentStatus, string> = {
  implemented: 'Implemented',
  new: 'New',
  planned: 'Planned',
  partial: 'Partial',
};

const STATUS_CLASS: Record<ComponentStatus, string> = {
  implemented: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  new: 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300',
  planned: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  partial: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
};

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: ComponentStatus;
  uses: string;
  note?: string;
  runnable: boolean;
}

const WORKFLOWS: Workflow[] = [
  {
    id: 'daily-briefing',
    name: 'Daily Portfolio Briefing',
    description:
      "Fetches your current cash balance, total value, holdings, and best/worst trade, then sends it via whichever notification channels you've enabled in Settings.",
    status: 'implemented',
    uses: 'Portfolio, Telegram, Email',
    note: 'Also runs automatically every day via a scheduled cron job — this button runs it immediately, on demand.',
    runnable: true,
  },
  {
    id: 'unusual-movers',
    name: 'Unusual Movers Alert',
    description:
      'Scan the watchlist for stocks/ETFs breaking from their own volatility norm, summarize with AI, push to Telegram.',
    status: 'planned',
    uses: 'Unusual Movers scanner, AI Report Generator, Telegram',
    note: 'Scanner exists today; not yet chained into a workflow.',
    runnable: false,
  },
  {
    id: 'signal-check',
    name: 'Signal Check on Demand',
    description: 'Market data → trade signal (pattern, entry, stop, target) → pushed as a reply.',
    status: 'partial',
    uses: 'Market data, Analysis engine, Telegram',
    note: "Available today via the Telegram bot's /signal <symbol> command; not yet a standalone dashboard workflow.",
    runnable: false,
  },
];

export default function WorkflowsPage() {
  const { token, loading: authLoading } = useAuth();
  const [selectedId, setSelectedId] = useState(WORKFLOWS[0].id);
  const [running, setRunning] = useState(false);
  const [sent, setSent] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [ran, setRan] = useState(false);

  const selected = WORKFLOWS.find((w) => w.id === selectedId)!;

  function select(id: string) {
    setSelectedId(id);
    setRan(false);
    setSent([]);
    setErrors([]);
  }

  async function run() {
    if (!token || running || !selected.runnable) return;
    setRunning(true);
    setRan(false);
    try {
      const result = await runWorkflow(token, selected.id);
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
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 p-6">
      <header className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <Link href="/" className="text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 underline">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">Workflows</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            End-to-end automations built by chaining the Components above. Ask the AI Guide to run one in plain language, or
            trigger it directly here.
          </p>
        </div>
        <Link href="/components" className="text-xs text-emerald-600 dark:text-emerald-400 underline whitespace-nowrap">
          View Components →
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 items-start">
        <div className="space-y-2">
          {WORKFLOWS.map((w) => (
            <button
              key={w.id}
              onClick={() => select(w.id)}
              className={`w-full text-left rounded-xl border p-4 transition-colors ${
                w.id === selectedId
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{w.name}</h3>
                <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_CLASS[w.status]}`}>
                  {STATUS_LABEL[w.status]}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{w.uses}</p>
            </button>
          ))}
        </div>

        <div className={`${CARD} min-h-[320px]`}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{selected.name}</h2>
            <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_CLASS[selected.status]}`}>
              {STATUS_LABEL[selected.status]}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{selected.description}</p>
          <p className="text-xs text-slate-500 mb-4">Uses: {selected.uses}</p>

          {!selected.runnable ? (
            <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-3 text-sm text-slate-600 dark:text-slate-400">
              Not implemented yet — this card represents the plan. {selected.note}
            </div>
          ) : authLoading ? (
            <p className="text-xs text-slate-500">Loading…</p>
          ) : !token ? (
            <p className="text-xs text-slate-500">Sign in to run this workflow.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={run}
                  disabled={running}
                  className="text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium"
                >
                  {running ? 'Running…' : '▶ Run'}
                </button>
                <span className="text-xs text-slate-500">{running ? 'Running' : ran ? 'Done' : 'Idle'}</span>
              </div>

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

              {selected.note && (
                <p className="text-[10px] text-slate-500 dark:text-slate-500 italic">{selected.note}</p>
              )}

              <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                <p className="text-xs text-slate-500">
                  Tip: you can also trigger this from the AI Guide chat by typing something like{' '}
                  <em>&ldquo;run my daily briefing&rdquo;</em> — it recognizes the request and runs this same workflow.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
