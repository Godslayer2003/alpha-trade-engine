'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AssetClass } from '@alpha-trade/shared-types';
import { useAuth } from '@/lib/auth-context';
import {
  chatWithAssistant,
  createCheckoutSession,
  fetchPaymentStatus,
  fetchAiEligibility,
  submitAssistantFeedback,
  verifyCheckoutSession,
  ASSISTANT_MODELS,
  type ChatMessage,
  type Citation,
} from '@/lib/api-client';

interface AssistantChatProps {
  symbol: string;
  assetClass: AssetClass;
  timeframe: string;
}

interface DisplayMessage extends ChatMessage {
  citations?: Citation[];
  model?: string;
  responseTimeMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  rating?: 'UP' | 'DOWN';
}

export function AssistantChat({ symbol, assetClass, timeframe }: AssistantChatProps) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string>(ASSISTANT_MODELS[0].id);
  const [openCitation, setOpenCitation] = useState<{ msgIndex: number; citation: Citation } | null>(null);

  // Paywall (course Task 7): a one-time $5 Stripe charge unlocks chat for a
  // signed-in user. Anonymous chat is unaffected (paid stays null, and the
  // gate below only ever checks it when `token` is present).
  const [paid, setPaid] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkoutAvailable, setCheckoutAvailable] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [eligible, setEligible] = useState<boolean | null>(null);
  useEffect(() => {
    setEligible(null);
    if (!token) return;
    let active = true;
    fetchAiEligibility(token).then(result => { if(active) setEligible(result.eligible); }).catch(() => { if(active) setEligible(false); });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const sessionId = new URLSearchParams(window.location.search).get('stripe_session_id');
    if (sessionId) {
      // Returning from Stripe Checkout — confirm the payment actually went
      // through before unlocking, then drop the query param from the URL.
      verifyCheckoutSession(token, sessionId)
        .then((res) => setPaid(res.paid))
        .catch(() => setPaid(false))
        .finally(() => {
          const url = new URL(window.location.href);
          url.searchParams.delete('stripe_session_id');
          window.history.replaceState({}, '', url.toString());
        });
      return;
    }
    fetchPaymentStatus(token)
      .then((res) => {
        setPaid(res.paid);
        setIsAdmin(res.admin);
        setCheckoutAvailable(res.checkoutAvailable === true);
      })
      .catch(() => setPaid(false));
  }, [token]);

  async function unlock() {
    if (!token || unlocking) return;
    setUnlocking(true);
    try {
      const { url } = await createCheckoutSession(token);
      window.location.href = url;
    } catch (err) {
      setError((err as Error).message);
      setUnlocking(false);
    }
  }


  async function send() {
    const text = draft.trim();
    if (!text || sending) return;

    const nextMessages: DisplayMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setDraft('');
    setSending(true);
    setError(null);

    try {
      const context: Record<string, unknown> = { symbol, assetClass, timeframe };

      const result = await chatWithAssistant(nextMessages, context, model, token ?? undefined);
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: result.reply,
          citations: result.citations,
          model: result.model,
          responseTimeMs: result.responseTimeMs,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        },
      ]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function rate(msgIndex: number, rating: 'UP' | 'DOWN') {
    if (!token) return;
    const assistantMsg = messages[msgIndex];
    const question = messages[msgIndex - 1]?.content ?? '';
    if (!assistantMsg || assistantMsg.role !== 'assistant') return;

    setMessages((prev) => prev.map((m, i) => (i === msgIndex ? { ...m, rating } : m)));
    try {
      await submitAssistantFeedback(token, {
        question,
        answer: assistantMsg.content,
        rating,
        model: assistantMsg.model ?? model,
        responseTimeMs: assistantMsg.responseTimeMs ?? 0,
        inputTokens: assistantMsg.inputTokens ?? 0,
        outputTokens: assistantMsg.outputTokens ?? 0,
      });
    } catch {
      // Rating is best-effort UI feedback — a failed save shouldn't disrupt the chat.
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed z-40 bottom-6 right-6 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white w-14 h-14 shadow-2xl flex items-center justify-center text-xl"
        aria-label="Open AI guide"
      >
        ?
      </button>
    );
  }

  return (
    <div className="fixed z-40 bottom-4 right-4 w-80 max-w-[calc(100vw-2rem)] max-h-[min(30rem,calc(100dvh-2rem))] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl flex flex-col">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-1.5">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">AI Guide</p>
            <p className="text-[10px] text-slate-500">Explains the app — not financial advice, can&apos;t place trades</p>
          </div>
          <div className="flex items-center gap-2">
            {token && paid && (
              <button
                onClick={() => setShowSettings((v) => !v)}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm"
                aria-label="Chat settings"
              >
                ⚙️
              </button>
            )}
            <button aria-label="Close AI guide" onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm">
              ✕
            </button>
          </div>
        </div>
        {showSettings && (
          <div className="rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-2">
            <p className="text-[11px] text-slate-700 dark:text-slate-300">
              {isAdmin ? 'Admin access — no payment required' : 'Payment status: Paid ✓ (refund policy subject to statutory rights — see Terms)'}
            </p>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <select
            aria-label="AI provider"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="flex-1 text-[10px] rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-1 focus:outline-none"
          >
            {ASSISTANT_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!token ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <p className="text-xs text-slate-600 dark:text-slate-400">Log in to use the AI Guide chat.</p>
        </div>
      ) : eligible !== true ? (
        <div className="p-4 text-sm"><p>AI features are currently limited to adults aged 18 or older in Canada.</p><Link href="/ai-access" className="underline">Confirm AI eligibility</Link></div>
      ) : paid === false ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Unlock the AI Guide chat with a one-time US$5 payment.
          </p>
          <button
            onClick={unlock}
            disabled={unlocking || !checkoutAvailable}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
          >
            {unlocking ? 'Redirecting…' : 'Unlock AI Guide — US$5'}
          </button>
          {!checkoutAvailable && <p className="text-xs">New purchases are currently unavailable. <Link href="/contact" className="underline">Contact support</Link>.</p>}
          <p className="text-[10px] text-slate-500">One-time payment; no automatic renewal. Refund policy and statutory rights: <Link href="/disclaimer" className="underline">Terms</Link>.</p>
          {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        </div>
      ) : (
        <>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
        {messages.length === 0 && (
          <p className="text-xs text-slate-500">
            Ask about the current signal, an indicator, or how paper trading works.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'ml-6' : 'mr-6'}>
            <div
              className={`rounded-lg px-2.5 py-1.5 text-xs ${
                m.role === 'user'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-100'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
              }`}
            >
              {m.content}
            </div>
            {m.role === 'assistant' && (m.citations?.length || token) && (
              <div className="flex flex-wrap items-center gap-1 mt-1">
                {m.citations?.map((c) => (
                  <button
                    key={c.index}
                    onClick={() => setOpenCitation({ msgIndex: i, citation: c })}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700"
                  >
                    [Source {c.index}]
                  </button>
                ))}
                {token && (
                  <span className="ml-auto flex gap-1">
                    <button
                      onClick={() => rate(i, 'UP')}
                      disabled={!!m.rating}
                      className={`text-[10px] px-1 disabled:opacity-40 ${m.rating === 'UP' ? 'opacity-100' : ''}`}
                      aria-label="Thumbs up"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => rate(i, 'DOWN')}
                      disabled={!!m.rating}
                      className={`text-[10px] px-1 disabled:opacity-40 ${m.rating === 'DOWN' ? 'opacity-100' : ''}`}
                      aria-label="Thumbs down"
                    >
                      👎
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
        {sending && <p className="text-xs text-slate-500">Thinking…</p>}
        {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      </div>

      {openCitation && (
        <div
          className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center p-4"
          onClick={() => setOpenCitation(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-xs max-h-64 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-1.5">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Source {openCitation.citation.index} — similarity {openCitation.citation.similarity.toFixed(2)}
              </p>
              <button onClick={() => setOpenCitation(null)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                ✕
              </button>
            </div>
            <p className="text-slate-600 dark:text-slate-400">{openCitation.citation.chunkText}</p>
          </div>
        </div>
      )}

      <p className="px-2 text-[11px] text-slate-600 dark:text-slate-400">
        Messages go to your selected AI provider. Free Gemini may use content for product improvement and human review.
        Don&apos;t enter personal or confidential information. Ratings save the question and answer for administrator review.{' '}
        <Link href="/privacy" className="underline">Privacy details</Link>
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="p-2 border-t border-slate-200 dark:border-slate-800 flex gap-2"
      >
        <input
          aria-label="Message for AI Guide"
          maxLength={4000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask a question…"
          className="min-w-0 flex-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={sending}
          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
        >
          Send
        </button>
      </form>
        </>
      )}
    </div>
  );
}
