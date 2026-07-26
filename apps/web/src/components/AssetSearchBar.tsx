'use client';

import { useState } from 'react';
import { AssetClass } from '@alpha-trade/shared-types';

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
    { label: 'QQQ', symbol: 'QQQ' },
    { label: 'S&P 500', symbol: '^GSPC' },
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
  onChange: (assetClass: AssetClass, symbol: string) => void;
}

export function AssetSearchBar({ assetClass, symbol, onChange }: AssetSearchBarProps) {
  const [draft, setDraft] = useState(symbol);

  function submitDraft() {
    const trimmed = draft.trim();
    if (trimmed) onChange(assetClass, trimmed);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={assetClass}
        onChange={(e) => {
          const nextClass = e.target.value as AssetClass;
          const defaultSymbol = QUICK_PICKS[nextClass][0].symbol;
          setDraft(defaultSymbol);
          onChange(nextClass, defaultSymbol);
        }}
        className="rounded-lg bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {Object.values(AssetClass).map((ac) => (
          <option key={ac} value={ac}>
            {ASSET_CLASS_LABELS[ac]}
          </option>
        ))}
      </select>

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
          placeholder="Symbol (e.g. QQQ)"
          className="rounded-lg bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          className="text-xs px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100"
        >
          Load
        </button>
      </form>

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
