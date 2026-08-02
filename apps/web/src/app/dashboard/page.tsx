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
  const [style, setStyle] = useState<InvestmentStyle>(InvestmentStyle.SWING_TRADING);
  const [assetClass, setAssetClass] = useState<AssetClass>(AssetClass.EQUITY);
  const [symbol, setSymbol] = useState('QQQ');
  const [timeframe, setTimeframe] = useState<Timeframe>(Timeframe.ONE_DAY);

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 p-6">
      <header className="flex flex-wrap justify-between items-center gap-3 mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">Alpha-Trade Engine // Terminal</h1>
        <div className="flex items-center gap-4">
          <span className="text-xs px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            Rules-based technical analysis — not financial advice
          </span>
          <Link href="/onboarding" className="text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 underline">
            Risk questionnaire
          </Link>
          <Link href="/settings" className="text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 underline">
            ⚙ Settings
          </Link>
          <AuthPanel />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md dark:shadow-2xl">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Live Asset & Pattern Analysis</h2>
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

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md dark:shadow-2xl">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Market News Explainer</h2>
            <TradeNewsWidget symbol={symbol} assetClass={assetClass} />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md dark:shadow-2xl">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Unusual Movers</h2>
            <MoversWidget
              onSelect={(nextClass, nextSymbol) => {
                setAssetClass(nextClass);
                setSymbol(nextSymbol);
              }}
            />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md dark:shadow-2xl">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Global Market Hours</h2>
            <MarketHoursWidget />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md dark:shadow-2xl">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Performance Dashboard</h2>
            <PerformanceDashboard />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md dark:shadow-2xl">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Sector & Company Recommendations</h2>
            <SectorRecommendationWidget style={style} />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md dark:shadow-2xl">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">AI Insight Report</h2>
            <InsightReportPanel symbol={symbol} assetClass={assetClass} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md dark:shadow-2xl">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Practice Portfolio</h2>
            <PortfolioPanel symbol={symbol} assetClass={assetClass} />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md dark:shadow-2xl">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Investment Strategy Customization</h2>
            <StrategySelectorPanel value={style} onChange={setStyle} />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md dark:shadow-2xl">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Optimized Broker Match</h2>
            <BrokerRecommendationWidget style={style} />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md dark:shadow-2xl">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Personalized Recommendations</h2>
            <RecommendationsPanel />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md dark:shadow-2xl">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Company Reports</h2>
            <CompanyReportsWidget />
          </div>
        </div>
      </div>

      <AssistantChat symbol={symbol} assetClass={assetClass} timeframe={timeframe} />

      <footer className="max-w-7xl mx-auto mt-10 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
        <Link href="/disclaimer" className="text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 underline">
          Disclaimer &amp; Terms of Use — not financial advice, simulated trading only
        </Link>
      </footer>
    </main>
  );
}
