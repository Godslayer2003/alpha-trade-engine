'use client';

import { useCallback, useEffect, useState } from 'react';
import { AssetClass } from '@alpha-trade/shared-types';
import { useAuth } from '@/lib/auth-context';
import { fetchPortfolio, postTrade, type Portfolio } from '@/lib/api-client';

interface PortfolioPanelProps {
  symbol: string;
  assetClass: AssetClass;
}

const currency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export function PortfolioPanel({ symbol, assetClass }: PortfolioPanelProps) {
  const { user, token } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [trading, setTrading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setPortfolio(await fetchPortfolio(token));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Keeps the practice portfolio's live prices/P&L in sync without a manual
  // reload — polling rather than a websocket, since the underlying quotes
  // themselves only update as fast as the candle data already backing the app.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 15_000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleTrade(side: 'BUY' | 'SELL') {
    if (!token) return;
    const qty = Number(quantity);
    if (!qty || qty <= 0) return;

    setTrading(true);
    setError(null);
    try {
      setPortfolio(await postTrade(token, { symbol, assetClass, side, quantity: qty }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTrading(false);
    }
  }

  if (!user) {
    return (
      <p className="text-sm text-slate-500">
        Log in to practice trading with $100,000 in fake cash — no real money involved.
      </p>
    );
  }

  if (loading && !portfolio) return <p className="text-sm text-slate-500">Loading portfolio…</p>;

  return (
    <div className="space-y-4">
      {portfolio && (
        <div className="flex justify-between text-sm">
          <div>
            <p className="text-slate-500">Cash</p>
            <p className="text-slate-900 dark:text-slate-100 font-medium">{currency(portfolio.cashBalance)}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500">Total value</p>
            <p className="text-slate-900 dark:text-slate-100 font-medium">{currency(portfolio.totalValue)}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 flex-1">
          Trade {symbol} at the latest available price (delayed, not real-time).
        </span>
        <input
          type="number"
          min="0"
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-20 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={() => handleTrade('BUY')}
          disabled={trading}
          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
        >
          Buy
        </button>
        <button
          onClick={() => handleTrade('SELL')}
          disabled={trading}
          className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white"
        >
          Sell
        </button>
      </div>

      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}

      {portfolio && portfolio.holdings.length > 0 && (
        <ul className="space-y-2">
          {portfolio.holdings.map((h) => (
            <li key={h.id} className="border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs">
              <div className="flex justify-between">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {h.ticker} · {h.quantity}
                </span>
                <span className={h.unrealizedPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                  {h.unrealizedPnL >= 0 ? '+' : ''}
                  {currency(h.unrealizedPnL)}
                </span>
              </div>
              <p className="text-slate-500 mt-0.5">
                Avg {currency(h.averagePrice)} · Now {currency(h.currentPrice)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
