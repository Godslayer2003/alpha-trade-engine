'use client';

import { useEffect, useState } from 'react';
import { AssetClass } from '@alpha-trade/shared-types';
import { fetchCandles, fetchReport, type AiReport } from '@/lib/api-client';

interface TradeNewsWidgetProps {
  symbol: string;
  assetClass: AssetClass;
}

// Fixed near-term window so this always reads as "what's happening right
// now", independent of whatever longer timeframe the chart above is set to.
const RECENT_MONTHS = 1;

export function TradeNewsWidget({ symbol, assetClass }: TradeNewsWidgetProps) {
  const [report, setReport] = useState<AiReport | null>(null);
  const [pctChange, setPctChange] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReport(null);
    setPctChange(null);

    Promise.all([fetchCandles(symbol, assetClass, '1M'), fetchReport(symbol, assetClass, RECENT_MONTHS)])
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
        if (!cancelled) setError(`Could not load recent news for ${symbol}.`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, assetClass]);

  return (
    <div className="space-y-3">
      {loading && <p className="text-sm text-slate-500">Reading the news on {symbol}…</p>}
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      {report && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
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
