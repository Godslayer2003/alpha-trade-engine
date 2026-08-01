'use client';

import { useEffect, useState } from 'react';
import { AssetClass } from '@alpha-trade/shared-types';
import { fetchCandles, fetchReport, type AiReport } from '@/lib/api-client';

interface TradeNewsWidgetProps {
  symbol: string;
  assetClass: AssetClass;
}

// Mirrors AssetSearchBar's category picker so typing "DJI" or "BTC" here
// resolves against the right upstream data source.
type MarketCategory = 'STOCKS' | 'ETFS' | 'INDEXES' | 'CRYPTO' | 'COMMODITY';

const CATEGORY_LABELS: Record<MarketCategory, string> = {
  STOCKS: 'Stock',
  ETFS: 'ETF',
  INDEXES: 'Index',
  CRYPTO: 'Crypto',
  COMMODITY: 'Commodity',
};

const CATEGORY_TO_ASSET_CLASS: Record<MarketCategory, AssetClass> = {
  STOCKS: AssetClass.EQUITY,
  ETFS: AssetClass.EQUITY,
  INDEXES: AssetClass.EQUITY,
  CRYPTO: AssetClass.CRYPTO,
  COMMODITY: AssetClass.COMMODITY,
};

// Fixed near-term window so this always reads as "what's happening right
// now", independent of whatever longer timeframe the chart above is set to.
const RECENT_MONTHS = 1;

export function TradeNewsWidget({ symbol, assetClass }: TradeNewsWidgetProps) {
  // Null until the user searches something themselves — until then this
  // panel just follows whatever's charted above.
  const [manual, setManual] = useState<{ symbol: string; assetClass: AssetClass } | null>(null);
  const [category, setCategory] = useState<MarketCategory>('STOCKS');
  const [draft, setDraft] = useState('');

  const activeSymbol = manual?.symbol ?? symbol;
  const activeAssetClass = manual?.assetClass ?? assetClass;

  const [report, setReport] = useState<AiReport | null>(null);
  const [pctChange, setPctChange] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The chart's own symbol search takes back over once it changes — a
  // lookup here is meant as a quick peek, not a permanent override.
  useEffect(() => {
    setManual(null);
  }, [symbol, assetClass]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReport(null);
    setPctChange(null);

    Promise.all([
      fetchCandles(activeSymbol, activeAssetClass, '1M'),
      fetchReport(activeSymbol, activeAssetClass, RECENT_MONTHS),
    ])
      .then(([candles, reportResult]) => {
        if (cancelled) return;
        if (candles.length >= 2) {
          const first = candles[0].close;
          const last = candles[candles.length - 1].close;
          setPctChange(((last - first) / first) * 100);
        }
        setReport(reportResult);
      })
      .catch(() => {
        if (!cancelled) setError(`Could not load recent news for ${activeSymbol}.`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeSymbol, activeAssetClass]);

  function submitSearch() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setManual({ symbol: trimmed.toUpperCase(), assetClass: CATEGORY_TO_ASSET_CLASS[category] });
  }

  // Split into a bold "headline" (first sentence) and the rest as the
  // article body — the report's first sentence always states the move
  // itself, so this reads like a real article rather than one flat blob.
  const headline = report?.content.match(/^(.+?[.!?])\s/)?.[1];
  const body = headline ? report!.content.slice(headline.length).trim() : report?.content;

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitSearch();
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as MarketCategory)}
          className="rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {(Object.keys(CATEGORY_LABELS) as MarketCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Look up any stock, index, crypto, or commodity…"
          className="flex-1 min-w-[10rem] rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium whitespace-nowrap"
        >
          Search
        </button>
      </form>

      {loading && <p className="text-sm text-slate-500">Reading the news on {activeSymbol}…</p>}
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      {report && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2 bg-slate-50 dark:bg-slate-950/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Why Is {activeSymbol} Moving?
            </h3>
            {pctChange !== null && (
              <span
                className={`text-sm font-semibold px-2.5 py-1 rounded-full ${
                  pctChange >= 0
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                }`}
              >
                {pctChange >= 0 ? '▲' : '▼'} {Math.abs(pctChange).toFixed(1)}% past month
              </span>
            )}
          </div>
          <p className="text-[11px] italic text-slate-500 dark:text-slate-500">
            {report.grounded ? 'Grounded with Google Search' : 'No news data found — technical read only'}
            {' · '}
            {new Date(report.generatedAt).toLocaleString()}
          </p>
          {headline && (
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">{headline}</p>
          )}
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{body}</p>
        </div>
      )}
    </div>
  );
}
