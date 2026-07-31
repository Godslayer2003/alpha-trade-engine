'use client';

import { useState } from 'react';
import { AssetClass, TIMEFRAME_LABELS, Timeframe } from '@alpha-trade/shared-types';

// UI-only categorization for the picker/quick-picks. The backend only knows
// three asset classes (EQUITY/CRYPTO/COMMODITY) — Stocks, ETFs, and Indexes
// all resolve through the same Yahoo Finance fetcher as EQUITY, so this
// exists purely to keep the quick-pick lists organized and short.
type MarketCategory = 'STOCKS' | 'ETFS' | 'INDEXES' | 'CRYPTO' | 'COMMODITY';

const MARKET_CATEGORIES: MarketCategory[] = ['STOCKS', 'ETFS', 'INDEXES', 'CRYPTO', 'COMMODITY'];

const CATEGORY_LABELS: Record<MarketCategory, string> = {
  STOCKS: 'Stocks',
  ETFS: 'ETFs',
  INDEXES: 'Indexes',
  CRYPTO: 'Cryptocurrency',
  COMMODITY: 'Commodities',
};

const CATEGORY_TO_ASSET_CLASS: Record<MarketCategory, AssetClass> = {
  STOCKS: AssetClass.EQUITY,
  ETFS: AssetClass.EQUITY,
  INDEXES: AssetClass.EQUITY,
  CRYPTO: AssetClass.CRYPTO,
  COMMODITY: AssetClass.COMMODITY,
};

// Quick picks are shortcuts for the handful of names most people look for
// first — not a catalog. Anything else is still just as loadable by typing
// it into the search bar above.
const QUICK_PICKS: Record<MarketCategory, { label: string; symbol: string }[]> = {
  STOCKS: [
    { label: 'NVIDIA', symbol: 'NVDA' },
    { label: 'Tesla', symbol: 'TSLA' },
    { label: 'Alphabet', symbol: 'GOOGL' },
    { label: 'Microsoft', symbol: 'MSFT' },
    { label: 'Apple', symbol: 'AAPL' },
  ],
  ETFS: [
    { label: 'SPY', symbol: 'SPY' },
    { label: 'VOO', symbol: 'VOO' },
    { label: 'QQQ', symbol: 'QQQ' },
    { label: 'AIS', symbol: 'AIS' },
    { label: 'PSI', symbol: 'PSI' },
  ],
  INDEXES: [
    { label: 'S&P 500', symbol: '^GSPC' },
    { label: 'NASDAQ Composite', symbol: '^IXIC' },
    { label: 'Dow Jones Industrial Average', symbol: '^DJI' },
    { label: 'Russell 2000', symbol: '^RUT' },
    { label: 'S&P/TSX Composite', symbol: '^GSPTSE' },
  ],
  CRYPTO: [
    { label: 'Bitcoin', symbol: 'BTCUSDT' },
    { label: 'Ethereum', symbol: 'ETHUSDT' },
    { label: 'Solana', symbol: 'SOLUSDT' },
  ],
  COMMODITY: [
    { label: 'Crude Oil', symbol: 'CL=F' },
    { label: 'Gold', symbol: 'GC=F' },
    { label: 'Silver', symbol: 'SI=F' },
    { label: 'Nat Gas', symbol: 'NG=F' },
  ],
};

interface AssetSearchBarProps {
  symbol: string;
  timeframe: Timeframe;
  onChange: (assetClass: AssetClass, symbol: string) => void;
  onTimeframeChange: (timeframe: Timeframe) => void;
}

export function AssetSearchBar({ symbol, timeframe, onChange, onTimeframeChange }: AssetSearchBarProps) {
  const [category, setCategory] = useState<MarketCategory>('STOCKS');
  const [draft, setDraft] = useState(symbol);

  function submitDraft() {
    const trimmed = draft.trim();
    if (trimmed) onChange(CATEGORY_TO_ASSET_CLASS[category], trimmed);
  }

  return (
    <div className="space-y-3">
      {/* Primary control: type any symbol Yahoo/Binance recognizes and load
          it directly — the quick picks below are shortcuts, not the only
          way in. Category only determines which data source the typed
          symbol is looked up against. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitDraft();
        }}
        className="flex items-center gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search any stock, index, crypto, or commodity (e.g. AAPL, ^DJI, BTC, CL=F)"
          className="flex-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          className="text-sm px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium whitespace-nowrap"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Market
          <select
            value={category}
            onChange={(e) => {
              const nextCategory = e.target.value as MarketCategory;
              const defaultSymbol = QUICK_PICKS[nextCategory][0].symbol;
              setCategory(nextCategory);
              setDraft(defaultSymbol);
              onChange(CATEGORY_TO_ASSET_CLASS[nextCategory], defaultSymbol);
            }}
            className="rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {MARKET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs text-slate-500">
          Timeframe
          <select
            value={timeframe}
            onChange={(e) => onTimeframeChange(e.target.value as Timeframe)}
            className="rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {Object.values(Timeframe).map((tf) => (
              <option key={tf} value={tf}>
                {TIMEFRAME_LABELS[tf]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_PICKS[category].map((pick) => (
          <button
            key={pick.symbol}
            onClick={() => {
              setDraft(pick.symbol);
              onChange(CATEGORY_TO_ASSET_CLASS[category], pick.symbol);
            }}
            className={`text-xs px-2.5 py-1 rounded-full border ${
              symbol === pick.symbol
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {pick.label}
          </button>
        ))}
      </div>
    </div>
  );
}
