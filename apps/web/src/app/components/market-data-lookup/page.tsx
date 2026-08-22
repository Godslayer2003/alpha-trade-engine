'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AssetClass } from '@alpha-trade/shared-types';
import { fetchQuote, type Quote } from '@/lib/api-client';

const CARD = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md dark:shadow-2xl';
const INPUT = 'w-full rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';
const LABEL = 'block text-sm text-slate-700 dark:text-slate-300 mb-1';

export default function MarketDataLookupPage() {
  const [symbol, setSymbol] = useState('AAPL');
  const [assetClass, setAssetClass] = useState<AssetClass>(AssetClass.EQUITY);
  const [running, setRunning] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!symbol.trim() || running) return;
    setRunning(true);
    setError(null);
    setQuote(null);
    try {
      setQuote(await fetchQuote(symbol.trim(), assetClass));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 p-6 max-w-2xl mx-auto">
      <Link href="/components" className="text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 underline">
        ← Components
      </Link>
      <h1 className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1 mb-1">Market Data Lookup</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
        Data Connector component — fetches the latest close price for any symbol from Yahoo Finance (equities/commodities) or
        Binance (crypto), the same sources that power the dashboard chart.
      </p>

      <div className={`${CARD} space-y-4`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Symbol</label>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. AAPL, BTCUSDT, GC=F"
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Asset class</label>
            <select value={assetClass} onChange={(e) => setAssetClass(e.target.value as AssetClass)} className={INPUT}>
              {Object.values(AssetClass).map((ac) => (
                <option key={ac} value={ac}>
                  {ac}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={run}
          disabled={running}
          className="text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium"
        >
          {running ? 'Running…' : '▶ Run'}
        </button>

        {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}

        {quote && (
          <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-3 text-sm space-y-1">
            <p>
              <span className="text-slate-500">Symbol:</span> <span className="font-medium">{quote.symbol}</span>
            </p>
            <p>
              <span className="text-slate-500">Price:</span> <span className="font-medium">${quote.price.toLocaleString()}</span>
            </p>
            <p>
              <span className="text-slate-500">As of:</span> {quote.asOf}
            </p>
            <p>
              <span className="text-slate-500">Data source:</span> {quote.dataSource}
            </p>
          </div>
        )}

        <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">How to get an API key</p>
          <p className="text-xs text-slate-500">
            None needed. Yahoo Finance's public chart endpoint and Binance's public REST API are both used without
            authentication — this is the one component in the app that requires zero secrets.
          </p>
        </div>
      </div>
    </main>
  );
}
