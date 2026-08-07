'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { fetchAssistantChunks, type AssistantChunk } from '@/lib/api-client';

const CARD = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-md dark:shadow-2xl';

export default function AssistantChunksPage() {
  const { user, token, loading: authLoading } = useAuth();

  const [chunkSize, setChunkSize] = useState(128);
  const [chunks, setChunks] = useState<AssistantChunk[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAssistantChunks(token, chunkSize);
      setChunks(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (authLoading) return null;

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

  const totalTokens = chunks?.reduce((sum, c) => sum + c.tokens, 0) ?? 0;

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 p-6">
      <div className="max-w-3xl mx-auto space-y-5 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Knowledge Base Chunks</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Exactly how the knowledge base is split for retrieval — one card per chunk, embedded with all-MiniLM-L6-v2.
            </p>
          </div>
          <Link href="/settings/assistant" className="text-xs text-slate-600 dark:text-slate-400 underline whitespace-nowrap">
            ← Back
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-700 dark:text-slate-300">Chunk size (tokens)</label>
          <input
            type="number"
            min={20}
            max={500}
            value={chunkSize}
            onChange={(e) => setChunkSize(Number(e.target.value))}
            className="w-24 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1.5 text-sm"
          />
          <button
            onClick={refresh}
            disabled={loading}
            className="text-sm px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
          >
            {loading ? 'Chunking…' : 'Re-chunk'}
          </button>
          {chunks && (
            <span className="text-xs text-slate-500 ml-auto">
              {chunks.length} chunks · {totalTokens} tokens
            </span>
          )}
        </div>

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="space-y-2">
          {chunks?.map((c) => (
            <div key={c.index} className={CARD}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                  Chunk {c.index}
                </span>
                <span className="text-[10px] text-slate-500">{c.tokens} tokens</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">{c.text}</p>
            </div>
          ))}
          {chunks?.length === 0 && <p className="text-sm text-slate-500">No chunks yet — the knowledge base is empty.</p>}
        </div>
      </div>
    </main>
  );
}
