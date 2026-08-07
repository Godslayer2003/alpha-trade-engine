'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { fetchAssistantConfig, updateAssistantConfig } from '@/lib/api-client';

const CARD = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md dark:shadow-2xl';
const TEXTAREA =
  'w-full h-72 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y';

export default function AssistantSettingsPage() {
  const { user, token, loading: authLoading } = useAuth();

  const [systemPrompt, setSystemPrompt] = useState('');
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [loading, setLoading] = useState(false);

  const [promptSaving, setPromptSaving] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);
  const [kbSaving, setKbSaving] = useState(false);
  const [kbSaved, setKbSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const config = await fetchAssistantConfig(token);
      setSystemPrompt(config.systemPrompt);
      setKnowledgeBase(config.knowledgeBase);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function savePrompt() {
    if (!token) return;
    setPromptSaving(true);
    setPromptSaved(false);
    setError(null);
    try {
      await updateAssistantConfig(token, { systemPrompt });
      setPromptSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPromptSaving(false);
    }
  }

  async function saveKnowledgeBase() {
    if (!token) return;
    setKbSaving(true);
    setKbSaved(false);
    setError(null);
    try {
      await updateAssistantConfig(token, { knowledgeBase });
      setKbSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setKbSaving(false);
    }
  }

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
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">AI Guide Settings</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Edit what the chatbot knows and how it behaves — changes apply immediately, no redeploy needed.
            </p>
          </div>
          <div className="flex gap-3 text-xs">
            <Link href="/settings/assistant/chunks" className="text-emerald-600 dark:text-emerald-400 underline">
              Chunks
            </Link>
            <Link href="/settings/assistant/results" className="text-emerald-600 dark:text-emerald-400 underline">
              Results
            </Link>
            <Link href="/settings" className="text-slate-600 dark:text-slate-400 underline">
              ← Back to settings
            </Link>
          </div>
        </div>

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="grid md:grid-cols-2 gap-6">
          <section className={CARD}>
            <h2 className="text-sm font-semibold mb-1 text-slate-800 dark:text-slate-200">Chatbot prompt</h2>
            <p className="text-[11px] text-slate-500 mb-3">
              Role and behavior instructions. Relevant knowledge base excerpts are appended automatically at chat time.
            </p>
            <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} className={TEXTAREA} spellCheck={false} />
            <button
              onClick={savePrompt}
              disabled={promptSaving}
              className="mt-3 text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
            >
              {promptSaving ? 'Saving…' : promptSaved ? 'Saved ✓' : 'Save prompt'}
            </button>
          </section>

          <section className={CARD}>
            <h2 className="text-sm font-semibold mb-1 text-slate-800 dark:text-slate-200">Knowledge base</h2>
            <p className="text-[11px] text-slate-500 mb-3">
              Facts the chatbot answers from. Kept separate from the prompt so you can update facts without touching wording.
            </p>
            <textarea value={knowledgeBase} onChange={(e) => setKnowledgeBase(e.target.value)} className={TEXTAREA} spellCheck={false} />
            <button
              onClick={saveKnowledgeBase}
              disabled={kbSaving}
              className="mt-3 text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
            >
              {kbSaving ? 'Saving…' : kbSaved ? 'Saved ✓' : 'Save knowledge base'}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
