'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createChart, ColorType, LineData, IChartApi } from 'lightweight-charts';
import { useAuth } from '@/lib/auth-context';
import { fetchPerformance, type Performance } from '@/lib/api-client';

const currency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export function PerformanceDashboard() {
  const { user, token } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setPerformance(await fetchPerformance(token));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 15_000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (!containerRef.current || !performance) return;

    if (!chartRef.current) {
      chartRef.current = createChart(containerRef.current, {
        layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#94a3b8' },
        grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
        width: containerRef.current.clientWidth,
        height: 220,
      });
    }
    const chart = chartRef.current;
    chart.applyOptions({ width: containerRef.current.clientWidth });

    const series = chart.addLineSeries({ color: '#34d399', lineWidth: 2 });
    const data: LineData[] = performance.equityCurve.map((p) => ({
      time: Math.floor(new Date(p.t).getTime() / 1000) as LineData['time'],
      value: p.value,
    }));
    series.setData(data);
    chart.timeScale().fitContent();

    return () => {
      chart.removeSeries(series);
    };
  }, [performance]);

  useEffect(() => {
    return () => {
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, []);

  if (!user) {
    return (
      <p className="text-sm text-slate-500">
        Log in to see how your practice portfolio has performed over time.
      </p>
    );
  }

  if (loading && !performance) return <p className="text-sm text-slate-500">Loading performance…</p>;
  if (error) return <p className="text-sm text-rose-400">{error}</p>;
  if (!performance) return null;

  const returnColor = performance.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400';
  const realizedColor = performance.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400';

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="w-full" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <p className="text-slate-500">Total return</p>
          <p className={`font-medium ${returnColor}`}>{performance.totalReturnPct.toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-slate-500">Realized P&L</p>
          <p className={`font-medium ${realizedColor}`}>{currency(performance.realizedPnL)}</p>
        </div>
        <div>
          <p className="text-slate-500">Win rate</p>
          <p className="font-medium text-slate-200">
            {performance.winRate === null ? '—' : `${Math.round(performance.winRate * 100)}%`}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Trades</p>
          <p className="font-medium text-slate-200">{performance.tradeCount}</p>
        </div>
      </div>

      {(performance.bestTrade || performance.worstTrade) && (
        <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-800 pt-3">
          {performance.bestTrade && (
            <div>
              <p className="text-slate-500">Best trade</p>
              <p className="text-emerald-400">
                {performance.bestTrade.ticker} +{currency(performance.bestTrade.pnl)}
              </p>
            </div>
          )}
          {performance.worstTrade && (
            <div>
              <p className="text-slate-500">Worst trade</p>
              <p className="text-rose-400">
                {performance.worstTrade.ticker} {currency(performance.worstTrade.pnl)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
