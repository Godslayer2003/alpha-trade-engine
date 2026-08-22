import Link from 'next/link';
import { ComponentCard } from '@/components/ComponentCard';

const CARD = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md dark:shadow-2xl';

export default function ComponentsPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 p-6">
      <header className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <Link href="/" className="text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 underline">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">Components</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Reusable building blocks the AI Guide and daily workflows are built from — data connectors, the agent(s) that reason
            over them, and the tools they can act through.
          </p>
        </div>
        <Link href="/workflows" className="text-xs text-emerald-600 dark:text-emerald-400 underline whitespace-nowrap">
          View Workflows →
        </Link>
      </header>

      <div className="space-y-8">
        <section className={CARD}>
          <h2 className="text-lg font-semibold mb-1 text-slate-800 dark:text-slate-200">Data Connectors</h2>
          <p className="text-xs text-slate-500 mb-4">Sources of market/account data the rest of the app reads from.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <ComponentCard
              name="Yahoo Finance"
              description="Equities, ETFs, indexes, and commodity futures — free OHLCV data behind the charts and signals."
              status="implemented"
              note="packages/ai-engine/app/data_sources/yahoo.py — no API key required."
            />
            <ComponentCard
              name="Binance"
              description="Crypto OHLCV data, same shared candle pipeline as Yahoo."
              status="implemented"
              note="packages/ai-engine/app/data_sources/binance.py — no API key required."
            />
            <ComponentCard
              name="Telegram account link"
              description="Links a user's Telegram chat to their account so other components/tools can reach them."
              status="implemented"
              href="/settings"
              note="Link it from Settings first — required by the Telegram components below."
            />
            <ComponentCard
              name="Market Data Lookup"
              description="Isolated component: look up a live quote for any symbol and see which data source served it."
              status="new"
              href="/components/market-data-lookup"
            />
          </div>
        </section>

        <section className={CARD}>
          <h2 className="text-lg font-semibold mb-1 text-slate-800 dark:text-slate-200">Agent (Brain)</h2>
          <p className="text-xs text-slate-500 mb-4">The models that reason over the data above and decide what to say or do.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <ComponentCard
              name="AI Guide"
              description="OpenRouter-backed, RAG-grounded chat over the app's knowledge base. Also classifies workflow intent — see Workflows."
              status="implemented"
              href="/settings/assistant"
            />
            <ComponentCard
              name="AI Report Generator"
              description="Gemini-generated written explainers for a symbol's recent price action and company reports."
              status="implemented"
              note="apps/api/src/reports/reports.service.ts — powers the Market News Explainer and Company Reports widgets."
            />
          </div>
        </section>

        <section className={CARD}>
          <h2 className="text-lg font-semibold mb-1 text-slate-800 dark:text-slate-200">Tools (Services)</h2>
          <p className="text-xs text-slate-500 mb-4">Actions the agent(s) and workflows can take on your behalf.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <ComponentCard
              name="Email (Resend)"
              description="Sends the daily portfolio report by email when enabled in Settings."
              status="implemented"
            />
            <ComponentCard
              name="Broker recommendation matrix"
              description="Advisory-only: suggests brokers matching your investing style. No OAuth, no live order placement."
              status="implemented"
              href="/settings"
            />
            <ComponentCard
              name="Telegram Test Message"
              description="Isolated component: send yourself a one-off Telegram ping to prove the bot link actually works."
              status="new"
              href="/components/telegram-test"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
