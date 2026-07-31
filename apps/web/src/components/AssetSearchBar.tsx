'use client';

import { useState } from 'react';
import { AssetClass, TIMEFRAME_LABELS, Timeframe } from '@alpha-trade/shared-types';

const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  [AssetClass.EQUITY]: 'Stocks / ETFs / Indices',
  [AssetClass.CRYPTO]: 'Cryptocurrency',
  [AssetClass.COMMODITY]: 'Commodities',
};

// Ticker syntax differs by data source (Yahoo vs Binance) and isn't obvious
// to a regular user (^GSPC for the S&P 500, CL=F for crude oil futures) —
// quick picks sidestep needing to know the exact format.
const QUICK_PICKS: Record<AssetClass, { label: string; symbol: string }[]> = {
  [AssetClass.EQUITY]: [
    // Major indices first — Yahoo's "^"-prefixed index tickers, same
    // fetcher as everything else in this asset class.
    { label: 'S&P 500', symbol: '^GSPC' },
    { label: 'Dow Jones', symbol: '^DJI' },
    { label: 'NASDAQ Composite', symbol: '^IXIC' },
    { label: 'Nasdaq-100', symbol: '^NDX' },
    { label: 'Russell 2000', symbol: '^RUT' },
    { label: 'VIX', symbol: '^VIX' },
    { label: 'TSX (Canada)', symbol: '^GSPTSE' },
    { label: 'FTSE 100 (UK)', symbol: '^FTSE' },
    { label: 'Nikkei 225 (Japan)', symbol: '^N225' },
    { label: 'DAX (Germany)', symbol: '^GDAXI' },
    { label: 'Hang Seng (HK)', symbol: '^HSI' },
    // ETFs and individual stocks
    { label: 'QQQ', symbol: 'QQQ' },
    { label: 'SPY', symbol: 'SPY' },
    { label: 'AAPL', symbol: 'AAPL' },
    { label: 'NVDA', symbol: 'NVDA' },
  ],
  [AssetClass.CRYPTO]: [
    { label: 'Bitcoin', symbol: 'BTCUSDT' },
    { label: 'Ethereum', symbol: 'ETHUSDT' },
    { label: 'Solana', symbol: 'SOLUSDT' },
  ],
  [AssetClass.COMMODITY]: [
    { label: 'Crude Oil', symbol: 'CL=F' },
    { label: 'Gold', symbol: 'GC=F' },
    { label: 'Silver', symbol: 'SI=F' },
    { label: 'Nat Gas', symbol: 'NG=F' },
  ],
};

interface AssetSearchBarProps {
  assetClass: AssetClass;
  symbol: string;
  timeframe: Timeframe;
  onChange: (assetClass: AssetClass, symbol: string) => void;
  onTimeframeChange: (timeframe: Timeframe) => void;
}

export function AssetSearchBar({
  assetClass,
  symbol,
  timeframe,
  onChange,
  onTimeframeChange,
}: AssetSearchBarProps) {
  const [draft, setDraft] = useState(symbol);

  function submitDraft() {
    const trimmed = draft.trim();
    if (trimmed) onChange(assetClass, trimmed);
  }

  return (
    <div className="space-y-3">
      {/* Primary control: type any symbol Yahoo/Binance recognizes and load
          it directly — the quick picks below are shortcuts, not the only
          way in. Asset class only determines which data source ("market")
          the typed symbol is looked up against. */}
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
          className="flex-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
            value={assetClass}
            onChange={(e) => {
              const nextClass = e.target.value as AssetClass;
              const defaultSymbol = QUICK_PICKS[nextClass][0].symbol;
              setDraft(defaultSymbol);
              onChange(nextClass, defaultSymbol);
            }}
            className="rounded-lg bg-slate-800 border border-slate-700 text-slate-100 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {Object.values(AssetClass).map((ac) => (
              <option key={ac} value={ac}>
                {ASSET_CLASS_LABELS[ac]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs text-slate-500">
          Timeframe
          <select
            value={timeframe}
            onChange={(e) => onTimeframeChange(e.target.value as Timeframe)}
            className="rounded-lg bg-slate-800 border border-slate-700 text-slate-100 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
        {QUICK_PICKS[assetClass].map((pick) => (
          <button
            key={pick.symbol}
            onClick={() => {
              setDraft(pick.symbol);
              onChange(assetClass, pick.symbol);
            }}
            className={`text-xs px-2.5 py-1 rounded-full border ${
              symbol === pick.symbol
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {pick.label}
          </button>
        ))}
      </div>
    </div>
  );
}
