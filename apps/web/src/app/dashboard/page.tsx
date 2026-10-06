'use client';

import { useState } from 'react';
import { AssetClass, InvestmentStyle, Timeframe } from '@alpha-trade/shared-types';
import { CandlestickChartWidget } from '@/components/CandlestickChartWidget';
import { AssetSearchBar } from '@/components/AssetSearchBar';
import { StrategySelectorPanel } from '@/components/StrategySelectorPanel';
import { BrokerRecommendationWidget } from '@/components/BrokerRecommendationWidget';
import { SectorRecommendationWidget } from '@/components/SectorRecommendationWidget';
import { MarketHoursWidget } from '@/components/MarketHoursWidget';
import { MoversWidget } from '@/components/MoversWidget';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';
import { TradeNewsWidget } from '@/components/TradeNewsWidget';
import { CompanyReportsWidget } from '@/components/CompanyReportsWidget';
import { AuthPanel } from '@/components/AuthPanel';
import { PortfolioPanel } from '@/components/PortfolioPanel';
import { PerformanceDashboard } from '@/components/PerformanceDashboard';
import { RecommendationsPanel } from '@/components/RecommendationsPanel';
import { InsightReportPanel } from '@/components/InsightReportPanel';
import { AssistantChat } from '@/components/AssistantChat';
import Link from 'next/link';

export default function DashboardPage() {
  const [workspace, setWorkspace] = useState<'research' | 'practice' | 'performance'>('research');
  const [style, setStyle] = useState<InvestmentStyle>(InvestmentStyle.SWING_TRADING);
  const [assetClass, setAssetClass] = useState<AssetClass>(AssetClass.EQUITY);
  const [symbol, setSymbol] = useState('QQQ');
  const [timeframe, setTimeframe] = useState<Timeframe>(Timeframe.ONE_DAY);

  return (
    <main className="mx-auto min-h-screen max-w-7xl bg-white p-3 text-slate-900 dark:bg-slate-950 dark:text-slate-50 sm:p-6">
      <header className="mb-3 flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 sm:text-2xl">Alpha Trade Engine</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/onboarding" className="text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 underline">
            Risk questionnaire
          </Link>
          <Link href="/components" className="text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 underline">
            Tools
          </Link>
          <Link href="/workflows" className="text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 underline">
            Workflows
          </Link>
          <Link href="/settings" className="text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 underline">
            Settings
          </Link>
          <AuthPanel />
        </div>
      </header>

      <DisclaimerBanner />

      <nav aria-label="Dashboard workspace" className="my-6 flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {(['research', 'practice', 'performance'] as const).map((view) => (
          <button key={view} type="button" aria-current={workspace === view ? 'page' : undefined}
            onClick={() => setWorkspace(view)}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${workspace === view ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'}`}>
            {{ research: 'Research', practice: 'Practice Portfolio', performance: 'Performance' }[view]}
          </button>
        ))}
      </nav>
      {workspace === 'practice' && <section className="rounded-xl border border-slate-200 p-5 dark:border-slate-800"><h2 className="text-xl font-semibold">Practice portfolio</h2><p className="mb-5 mt-2 text-sm text-slate-500">Simulated funds and trades. No real orders are placed.</p><PortfolioPanel symbol={symbol} assetClass={assetClass} /></section>}
      {workspace === 'performance' && <section className="rounded-xl border border-slate-200 p-5 dark:border-slate-800"><h2 className="mb-5 text-xl font-semibold">Practice performance</h2><PerformanceDashboard /></section>}
      {workspace === 'research' && <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 sm:space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-md dark:border-slate-800 dark:bg-slate-900 dark:shadow-2xl sm:p-5">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Price chart</h2>
            <div className="mb-4">
              <AssetSearchBar
                symbol={symbol}
                timeframe={timeframe}
                onChange={(nextClass, nextSymbol) => {
                  setAssetClass(nextClass);
                  setSymbol(nextSymbol);
                }}
                onTimeframeChange={setTimeframe}
              />
            </div>
            <CandlestickChartWidget symbol={symbol} assetClass={assetClass} timeframe={timeframe} />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Asset analysis</h2>
            <InsightReportPanel symbol={symbol} assetClass={assetClass} />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Market news</h2>
            <TradeNewsWidget symbol={symbol} assetClass={assetClass} />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Market movers</h2>
            <MoversWidget
              onSelect={(nextClass, nextSymbol) => {
                setAssetClass(nextClass);
                setSymbol(nextSymbol);
              }}
            />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Market hours</h2>
            <MarketHoursWidget />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Sector ideas</h2>
            <SectorRecommendationWidget style={style} />
          </div>


        </div>

        <div className="min-w-0 space-y-4 sm:space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Your strategy</h2>
            <StrategySelectorPanel value={style} onChange={setStyle} />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Broker comparison</h2>
            <BrokerRecommendationWidget style={style} />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Saved ideas</h2>
            <RecommendationsPanel />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Company Reports</h2>
            <CompanyReportsWidget />
          </div>
        </div>
      </div>

      }
      <AssistantChat symbol={symbol} assetClass={assetClass} timeframe={timeframe} />

      <footer className="max-w-7xl mx-auto mt-10 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
        <Link href="/disclaimer" className="text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 underline">
          Disclaimer &amp; Terms of Use — not financial advice, simulated trading only
        </Link>
      </footer>
    </main>
  );
}
