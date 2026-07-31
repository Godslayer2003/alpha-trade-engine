'use client';

import { useState } from 'react';
import { AssetClass } from '@alpha-trade/shared-types';
import { useAuth } from '@/lib/auth-context';
import { chatWithAssistant, fetchPortfolio, type ChatMessage } from '@/lib/api-client';

interface AssistantChatProps {
  symbol: string;
  assetClass: AssetClass;
  timeframe: string;
}

export function AssistantChat({ symbol, assetClass, timeframe }: AssistantChatProps) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setDraft('');
    setSending(true);
    setError(null);

    try {
      const context: Record<string, unknown> = { symbol, assetClass, timeframe };
      if (token) {
        try {
          const portfolio = await fetchPortfolio(token);
          context.portfolio = {
            cashBalance: portfolio.cashBalance,
            totalValue: portfolio.totalValue,
            holdingCount: portfolio.holdings.length,
          };
        } catch {
          // Portfolio context is best-effort — chat still works without it.
        }
      }

      const reply = await chatWithAssistant(nextMessages, context);
      setMessages([...nextMessages, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white w-14 h-14 shadow-2xl flex items-center justify-center text-xl"
        aria-label="Open AI guide"
      >
        ?
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 max-h-[28rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl flex flex-col">
      <div className="flex justify-between items-center p-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">AI Guide</p>
          <p className="text-[10px] text-slate-500">Explains the app — not financial advice, can&apos;t place trades</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
        {messages.length === 0 && (
          <p className="text-xs text-slate-500">
            Ask about the current signal, an indicator, or how paper trading works.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg px-2.5 py-1.5 text-xs ${
              m.role === 'user'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-100 ml-6'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 mr-6'
            }`}
          >
            {m.content}
          </div>
        ))}
        {sending && <p className="text-xs text-slate-500">Thinking…</p>}
        {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="p-2 border-t border-slate-200 dark:border-slate-800 flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={sending}
          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
        >
          Send
        </button>
      </form>
    </div>
  );
}
