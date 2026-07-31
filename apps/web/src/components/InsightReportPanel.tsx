'use client';

import { useState } from 'react';
import { AssetClass } from '@alpha-trade/shared-types';
import { fetchReport, type AiReport } from '@/lib/api-client';

interface InsightReportPanelProps {
  symbol: string;
  assetClass: AssetClass;
}

const PERIOD_OPTIONS = [
  { label: '1 Month', months: 1 },
  { label: '3 Months', months: 3 },
  { label: '4 Months', months: 4 },
  { label: '6 Months', months: 6 },
  { label: '1 Year', months: 12 },
];

export function InsightReportPanel({ symbol, assetClass }: InsightReportPanelProps) {
  const [querySymbol, setQuerySymbol] = useState(symbol);
  const [months, setMonths] = useState(4);
  const [report, setReport] = useState<AiReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    const trimmed = querySymbol.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      setReport(await fetchReport(trimmed, assetClass, months));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={querySymbol}
          onChange={(e) => setQuerySymbol(e.target.value)}
          placeholder="Symbol (e.g. BTCUSDT, AAPL)"
          className="flex-1 min-w-[8rem] rounded-lg bg-slate-800 border border-slate-700 text-slate-100 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <select
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="rounded-lg bg-slate-800 border border-slate-700 text-slate-100 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {PERIOD_OPTIONS.map((p) => (
            <option key={p.months} value={p.months}>
              {p.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
        >
          {loading ? 'Generating…' : 'Generate Report'}
        </button>
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}

      {report && (
        <div className="border border-slate-800 rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-200">
              {report.symbol} · {PERIOD_OPTIONS.find((p) => p.months === months)?.label}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                report.grounded
                  ? 'border-emerald-800 text-emerald-400 bg-emerald-950'
                  : 'border-slate-700 text-slate-400 bg-slate-800'
              }`}
            >
              {report.grounded ? 'Grounded with Google Search' : 'Technical analysis only — no news data'}
            </span>
          </div>
          <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{report.content}</p>
        </div>
      )}
    </div>
  );
}
