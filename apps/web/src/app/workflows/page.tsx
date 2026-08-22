import Link from 'next/link';
import { ComponentCard } from '@/components/ComponentCard';

const CARD = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md dark:shadow-2xl';

export default function WorkflowsPage() {
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

      <div className={CARD}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <ComponentCard
            name="Daily Portfolio Briefing"
            description="Portfolio + performance + best/worst trade → sent via your configured Telegram/Email channels."
            status="implemented"
            href="/workflows/daily-briefing"
            note="Uses: Portfolio, Telegram, Email. Also runs automatically every day via a scheduled cron job (see Settings)."
          />
          <ComponentCard
            name="Unusual Movers Alert"
            description="Scan the watchlist for stocks/ETFs breaking from their own volatility norm, summarize with AI, push to Telegram."
            status="planned"
            note="Uses: Unusual Movers scanner, AI Report Generator, Telegram. Scanner exists today; not yet chained into a workflow."
          />
          <ComponentCard
            name="Signal Check on Demand"
            description="Market data → trade signal (pattern, entry, stop, target) → pushed as a reply."
            status="partial"
            note="Available today via the Telegram bot's /signal <symbol> command; not yet a standalone dashboard workflow."
          />
        </div>
      </div>
    </main>
  );
}
