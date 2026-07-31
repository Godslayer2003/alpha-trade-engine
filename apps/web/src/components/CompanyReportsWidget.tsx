'use client';

import { useEffect, useState } from 'react';
import { AssetClass } from '@alpha-trade/shared-types';
import { fetchReport, type AiReport } from '@/lib/api-client';

// Same five names as the dashboard's quick-pick stock list (AssetSearchBar) —
// keeps the curated set consistent across the app rather than inventing a
// second list.
const COMPANIES = [
  { label: 'Apple', symbol: 'AAPL' },
  { label: 'NVIDIA', symbol: 'NVDA' },
  { label: 'Tesla', symbol: 'TSLA' },
  { label: 'Alphabet', symbol: 'GOOGL' },
  { label: 'Microsoft', symbol: 'MSFT' },
];

// Real companies report quarterly (every ~3 months), not on a 4-month
// cadence — this uses 4 months as requested, which just means the window
// straddles slightly more than one earnings period.
const REPORT_MONTHS = 4;

export function CompanyReportsWidget() {
  const [symbol, setSymbol] = useState(COMPANIES[0].symbol);
  const [report, setReport] = useState<AiReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReport(null);

    fetchReport(symbol, AssetClass.EQUITY, REPORT_MONTHS)
      .then((result) => {
        if (!cancelled) setReport(result);
      })
      .catch(() => {
        if (!cancelled) setError(`Could not load ${symbol}'s report.`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {COMPANIES.map((c) => (
          <button
            key={c.symbol}
            onClick={() => setSymbol(c.symbol)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              symbol === c.symbol
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-500">Loading {symbol}'s 4-month report…</p>}
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      {report && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {report.symbol} · Last 4 Months
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                report.grounded
                  ? 'border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950'
                  : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
              }`}
            >
              {report.grounded ? 'Grounded with Google Search' : 'No news data — technical read only'}
            </span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
            {report.content}
          </p>
        </div>
      )}
    </div>
  );
}
