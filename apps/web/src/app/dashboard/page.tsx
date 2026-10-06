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
import { PortfolioPanel } from '@/components/PortfolioPanel';
import { PerformanceDashboard } from '@/components/PerformanceDashboard';
import { RecommendationsPanel } from '@/components/RecommendationsPanel';
import { InsightReportPanel } from '@/components/InsightReportPanel';
import { AssistantChat } from '@/components/AssistantChat';

export default function DashboardPage() {
  const [workspace, setWorkspace] = useState<'research' | 'practice' | 'performance'>('research');
  const [style, setStyle] = useState<InvestmentStyle>(InvestmentStyle.SWING_TRADING);
  const [assetClass, setAssetClass] = useState<AssetClass>(AssetClass.EQUITY);
  const [symbol, setSymbol] = useState('QQQ');
  const [timeframe, setTimeframe] = useState<Timeframe>(Timeframe.ONE_DAY);

  return (
    <main className="workspace-shell">
      <header className="workspace-heading">
        <div><h1>Market workspace</h1><p>Research markets. Practice with simulated funds.</p></div>
        <p className="market-selection"><span>{symbol}</span><span>{timeframe}</span></p>
      </header>

      <DisclaimerBanner />

      <nav aria-label="Dashboard workspace" className="workspace-switcher">
        {(['research', 'practice', 'performance'] as const).map((view) => (
          <button key={view} type="button" aria-pressed={workspace === view}
            onClick={() => setWorkspace(view)}
            className="workspace-tab">
            {{ research: 'Research', practice: 'Practice', performance: 'Performance' }[view]}
          </button>
        ))}
      </nav>
      {workspace === 'practice' && <section className="workspace-panel"><h2 className="text-xl font-semibold">Practice portfolio</h2><p className="mb-5 mt-2 text-sm text-slate-500">Simulated funds and trades. No real orders are placed.</p><PortfolioPanel symbol={symbol} assetClass={assetClass} /></section>}
      {workspace === 'performance' && <section className="workspace-panel"><h2 className="mb-5 text-xl font-semibold">Practice performance</h2><PerformanceDashboard /></section>}
      {workspace === 'research' && <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 sm:space-y-6 lg:col-span-2">
          <div className="chart-panel">
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

          <div className="workspace-panel">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Asset analysis</h2>
            <InsightReportPanel symbol={symbol} assetClass={assetClass} />
          </div>

          <div className="workspace-panel">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Market news</h2>
            <TradeNewsWidget symbol={symbol} assetClass={assetClass} />
          </div>

          <div className="workspace-panel">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Market movers</h2>
            <MoversWidget
              onSelect={(nextClass, nextSymbol) => {
                setAssetClass(nextClass);
                setSymbol(nextSymbol);
              }}
            />
          </div>

          <div className="workspace-panel">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Market hours</h2>
            <MarketHoursWidget />
          </div>

          <div className="workspace-panel">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Sector ideas</h2>
            <SectorRecommendationWidget style={style} />
          </div>


        </div>

        <div className="min-w-0 space-y-4 sm:space-y-6">
          <div className="workspace-panel">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Your strategy</h2>
            <StrategySelectorPanel value={style} onChange={setStyle} />
          </div>

          <div className="workspace-panel">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Broker comparison</h2>
            <BrokerRecommendationWidget style={style} />
          </div>

          <div className="workspace-panel">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Saved ideas</h2>
            <RecommendationsPanel />
          </div>

          <div className="workspace-panel">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Company Reports</h2>
            <CompanyReportsWidget />
          </div>
        </div>
      </div>

      }
      <AssistantChat symbol={symbol} assetClass={assetClass} timeframe={timeframe} />

    </main>
  );
}
