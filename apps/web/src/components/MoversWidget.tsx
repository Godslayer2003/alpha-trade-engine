'use client';

import { useEffect, useState } from 'react';
import { AssetClass } from '@alpha-trade/shared-types';
import { fetchMovers, type Mover } from '@/lib/api-client';

const REFRESH_INTERVAL_MS = 5 * 60_000;

interface MoversWidgetProps {
  onSelect: (assetClass: AssetClass, symbol: string) => void;
}

export function MoversWidget({ onSelect }: MoversWidgetProps) {
  const [movers, setMovers] = useState<Mover[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    function load() {
      fetchMovers()
        .then((result) => {
          if (!cancelled) {
            setMovers(result);
            setError(null);
          }
        })
        .catch(() => {
          if (!cancelled) setError('Could not reach the API for unusual movers.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Stocks & ETFs moving unusually relative to their own recent volatility — click one to see why in the
        news explainer above.
      </p>

      {loading && <p className="text-sm text-slate-500">Scanning for unusual movers…</p>}
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      {!loading && !error && movers.length === 0 && (
        <p className="text-sm text-slate-500">No unusually large moves detected in the watchlist right now.</p>
      )}

      <ul className="space-y-2">
        {movers.map((mover) => {
          const isUp = mover.pctChange >= 0;
          return (
            <li key={mover.symbol}>
              <button
                onClick={() => onSelect(mover.assetClass, mover.symbol)}
                className="w-full text-left border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{mover.symbol}</span>
                    <span className="text-xs text-slate-500">${mover.price.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {Math.abs(mover.zScore).toFixed(1)}σ from its usual daily move
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isUp
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                  }`}
                >
                  {isUp ? '+' : ''}
                  {mover.pctChange.toFixed(1)}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
