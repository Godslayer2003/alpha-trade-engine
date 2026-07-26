'use client';

import { useState } from 'react';
import { AssetClass, InvestmentStyle } from '@alpha-trade/shared-types';
import { CandlestickChartWidget } from '@/components/CandlestickChartWidget';
import { AssetSearchBar } from '@/components/AssetSearchBar';
import { StrategySelectorPanel } from '@/components/StrategySelectorPanel';
import { BrokerRecommendationWidget } from '@/components/BrokerRecommendationWidget';
import { SectorRecommendationWidget } from '@/components/SectorRecommendationWidget';

const TIMEFRAME = '1D';

export default function DashboardPage() {
  const [style, setStyle] = useState<InvestmentStyle>(InvestmentStyle.SWING_TRADING);
  const [assetClass, setAssetClass] = useState<AssetClass>(AssetClass.EQUITY);
  const [symbol, setSymbol] = useState('QQQ');

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <header className="flex flex-wrap justify-between items-center gap-3 mb-8 border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-emerald-400">Alpha-Trade Engine // Terminal</h1>
        <div className="flex items-center gap-4">
          <span className="text-xs px-3 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
            Rules-based technical analysis — not financial advice
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl">
            <h2 className="text-lg font-semibold mb-4 text-slate-200">Live Asset & Pattern Analysis</h2>
            <div className="mb-4">
              <AssetSearchBar
                assetClass={assetClass}
                symbol={symbol}
                onChange={(nextClass, nextSymbol) => {
                  setAssetClass(nextClass);
                  setSymbol(nextSymbol);
                }}
              />
            </div>
            <CandlestickChartWidget symbol={symbol} assetClass={assetClass} timeframe={TIMEFRAME} />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl">
            <h2 className="text-lg font-semibold mb-4 text-slate-200">Sector & Company Recommendations</h2>
            <SectorRecommendationWidget style={style} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl">
            <h2 className="text-lg font-semibold mb-4 text-slate-200">Investment Strategy Customization</h2>
            <StrategySelectorPanel value={style} onChange={setStyle} />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl">
            <h2 className="text-lg font-semibold mb-4 text-slate-200">Optimized Broker Match</h2>
            <BrokerRecommendationWidget style={style} />
          </div>
        </div>
      </div>
    </main>
  );
}
