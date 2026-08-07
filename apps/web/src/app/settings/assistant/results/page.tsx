'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { fetchAssistantFeedback, type AssistantFeedbackList, type AssistantFeedbackRow } from '@/lib/api-client';

const CARD = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-md dark:shadow-2xl';

export default function AssistantResultsPage() {
  const { user, token, loading: authLoading } = useAuth();

  const [data, setData] = useState<AssistantFeedbackList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AssistantFeedbackRow | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setData(await fetchAssistantFeedback(token));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (authLoading || loading) return null;

  if (!user) {
    return (
      <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-slate-700 dark:text-slate-300">Log in first on the dashboard, then come back here.</p>
          <Link href="/dashboard" className="text-emerald-600 dark:text-emerald-400 underline">
            Go to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-5 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">AI Guide Results</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Thumbs up/down ratings collected from the AI Guide chat widget.
            </p>
          </div>
          <Link href="/settings/assistant" className="text-xs text-slate-600 dark:text-slate-400 underline whitespace-nowrap">
            ← Back
          </Link>
        </div>

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        {data && (
          <div className="grid grid-cols-3 gap-3">
            <div className={CARD}>
              <p className="text-[11px] text-slate-500 mb-1">Thumbs up</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">👍 {data.stats.up}</p>
            </div>
            <div className={CARD}>
              <p className="text-[11px] text-slate-500 mb-1">Thumbs down</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">👎 {data.stats.down}</p>
            </div>
            <div className={CARD}>
              <p className="text-[11px] text-slate-500 mb-1">Positive</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{data.stats.positivePct}%</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {data?.rows.map((row) => (
            <button
              key={row.id}
              onClick={() => setSelected(row)}
              className={CARD + ' w-full text-left hover:border-emerald-400 dark:hover:border-emerald-700 transition-colors'}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{row.rating === 'UP' ? '👍' : '👎'}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {row.model}
                </span>
                <span className="text-[10px] text-slate-500 ml-auto">{new Date(row.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
                <span className="font-medium">Q:</span> {row.question}
              </p>
              <p className="text-xs text-slate-500 truncate">
                <span className="font-medium">A:</span> {row.answer}
              </p>
            </button>
          ))}
          {data?.rows.length === 0 && <p className="text-sm text-slate-500">No rated responses yet.</p>}
        </div>

        {selected && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50" onClick={() => setSelected(null)}>
            <div
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-5 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-3">
                <span>{selected.rating === 'UP' ? '👍 Thumbs up' : '👎 Thumbs down'}</span>
                <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                  ✕
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-[11px] text-slate-500 mb-0.5">Question</p>
                  <p className="text-slate-800 dark:text-slate-200">{selected.question}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 mb-0.5">Answer</p>
                  <p className="text-slate-800 dark:text-slate-200">{selected.answer}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <p>Model: {selected.model}</p>
                  <p>Response time: {selected.responseTimeMs}ms</p>
                  <p>Input tokens: {selected.inputTokens}</p>
                  <p>Output tokens: {selected.outputTokens}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
