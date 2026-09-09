'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickData, IChartApi } from 'lightweight-charts';
import { AssetClass, DealType } from '@alpha-trade/shared-types';
import { fetchCandles, fetchTradeSignal, fetchWithWakeupRetry, type TradeSignal } from '@/lib/api-client';
import { useTheme } from '@/lib/theme-context';

interface CandlestickChartWidgetProps {
  symbol: string;
  assetClass: AssetClass;
  timeframe: string;
}

const DEAL_TYPE_STYLES: Record<DealType, string> = {
  [DealType.LONG]: 'text-emerald-600 dark:text-emerald-400',
  [DealType.SHORT]: 'text-rose-600 dark:text-rose-400',
  [DealType.NEUTRAL]: 'text-slate-600 dark:text-slate-400',
};

export function CandlestickChartWidget({ symbol, assetClass, timeframe }: CandlestickChartWidgetProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartWaking, setChartWaking] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [signal, setSignal] = useState<TradeSignal | null>(null);
  const [loadingSignal, setLoadingSignal] = useState(false);
  const [signalError, setSignalError] = useState<string | null>(null);
  const [signalWaking, setSignalWaking] = useState(false);

  useEffect(() => {
    setSignal(null);
    setSignalError(null);

    if (!containerRef.current) return;

    const isDark = theme === 'dark';
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDark ? '#94a3b8' : '#475569',
      },
      grid: {
        vertLines: { color: isDark ? '#1e293b' : '#e2e8f0' },
        horzLines: { color: isDark ? '#1e293b' : '#e2e8f0' },
      },
      width: containerRef.current.clientWidth,
      height: window.matchMedia('(max-width: 640px)').matches ? 260 : 360,
    });
    chartRef.current = chart;

    const series = chart.addCandlestickSeries({
      upColor: '#34d399',
      downColor: '#f87171',
      borderVisible: false,
      wickUpColor: '#34d399',
      wickDownColor: '#f87171',
    });

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: window.matchMedia('(max-width: 640px)').matches ? 260 : 360,
        });
      }
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', handleResize);

    let cancelled = false;
    setChartLoading(true);
    setChartError(null);
    setChartWaking(false);

    fetchWithWakeupRetry(
      () => fetchCandles(symbol, assetClass, timeframe),
      () => {
        if (!cancelled) setChartWaking(true);
      },
    )
      .then((candles) => {
        if (cancelled) return;
        // Use a full Unix timestamp rather than a date-only string: several
        // timeframes (1H, 1M) fetch multiple intraday candles per calendar
        // day, and a date-only key would collapse them onto the same point.
        const data: CandlestickData[] = candles.map((c) => ({
          time: Math.floor(new Date(c.time).getTime() / 1000) as CandlestickData['time'],
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        series.setData(data);
        chart.timeScale().fitContent();
      })
      .catch((err: Error) => {
        if (!cancelled) setChartError(err.message);
      })
      .finally(() => {
        if (!cancelled) {
          setChartLoading(false);
          setChartWaking(false);
        }
      });

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [symbol, assetClass, timeframe, theme, reloadKey]);

  async function requestSignal() {
    setLoadingSignal(true);
    setSignalError(null);
    setSignalWaking(false);
    try {
      setSignal(
        await fetchWithWakeupRetry(
          () => fetchTradeSignal(symbol, assetClass, timeframe),
          () => setSignalWaking(true),
        ),
      );
    } catch (err) {
      setSignalError((err as Error).message);
    } finally {
      setLoadingSignal(false);
      setSignalWaking(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {symbol} · {timeframe}
        </span>
        <button
          onClick={requestSignal}
          disabled={loadingSignal || chartLoading}
          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
        >
          {loadingSignal ? 'Analyzing…' : 'Get AI Signal'}
        </button>
      </div>

      {chartLoading && !chartWaking && <p className="text-sm text-slate-500">Loading real market data…</p>}
      {chartWaking && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Waking up the server — this can take up to a minute after a while of no visitors…
        </p>
      )}
      {chartError && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-rose-600 dark:text-rose-400">
          <p>{chartError}</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-medium hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/30"
          >
            Retry chart
          </button>
        </div>
      )}

      <div ref={containerRef} className="w-full min-w-0 overflow-hidden" />

      {signalWaking && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Waking up the server — this can take up to a minute after a while of no visitors…
        </p>
      )}
      {signalError && <p className="text-sm text-rose-600 dark:text-rose-400">{signalError}</p>}

      {signal && (
        <div className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 rounded-lg p-4 space-y-1">
          <p className="text-sm text-slate-800 dark:text-slate-200">
            Pattern: <span className="font-medium">{signal.patternDetected}</span>{' '}
            <span className={`font-semibold ${DEAL_TYPE_STYLES[signal.dealType]}`}>
              ({signal.dealType})
            </span>
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Entry {signal.entryPrice}
            {signal.stopLoss !== null && ` · Stop ${signal.stopLoss}`}
            {signal.targetPrice !== null && ` · Target ${signal.targetPrice}`}
            {signal.riskRewardRatio !== null && ` · R:R ${signal.riskRewardRatio}`}
            {' · Confidence '}
            {Math.round(signal.confidence * 100)}%
          </p>
          <p className="text-[11px] text-slate-500">
            Source: {signal.dataSource} · Generated {new Date(signal.generatedAt).toLocaleString()}
          </p>
          <p className="text-xs text-amber-700/90 dark:text-amber-400/90 italic">{signal.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
