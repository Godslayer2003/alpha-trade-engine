'use client';

import { useEffect, useState } from 'react';
import { InvestmentStyle, Sector } from '@alpha-trade/shared-types';
import { fetchSectorRecommendations, type CompanyRecommendation } from '@/lib/api-client';

const SECTOR_LABELS: Record<Sector, string> = {
  [Sector.TECHNOLOGY]: 'Technology',
  [Sector.HEALTHCARE]: 'Healthcare',
  [Sector.FINANCIALS]: 'Financials',
  [Sector.ENERGY]: 'Energy',
  [Sector.CONSUMER_DISCRETIONARY]: 'Consumer Discretionary',
  [Sector.INDUSTRIALS]: 'Industrials',
};

interface SectorRecommendationWidgetProps {
  style: InvestmentStyle;
}

export function SectorRecommendationWidget({ style }: SectorRecommendationWidgetProps) {
  const [sector, setSector] = useState<Sector>(Sector.TECHNOLOGY);
  const [companies, setCompanies] = useState<CompanyRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSectorRecommendations(sector, style)
      .then((result) => {
        if (!cancelled) setCompanies(result);
      })
      .catch(() => {
        if (!cancelled) setError('Could not reach the API for sector recommendations.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sector, style]);

  return (
    <div className="space-y-3">
      <label htmlFor="sector-select" className="block text-sm text-slate-600 dark:text-slate-400">
        Sector
      </label>
      <select
        id="sector-select"
        value={sector}
        onChange={(e) => setSector(e.target.value as Sector)}
        className="w-full rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {Object.values(Sector).map((s) => (
          <option key={s} value={s}>
            {SECTOR_LABELS[s]}
          </option>
        ))}
      </select>

      {loading && <p className="text-sm text-slate-500">Loading companies…</p>}
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      {!loading && !error && companies.length === 0 && (
        <p className="text-sm text-slate-500">
          No curated picks for this sector under the current strategy.
        </p>
      )}

      <ul className="space-y-3">
        {companies.map((company) => (
          <li key={company.ticker} className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
            <div className="flex justify-between items-baseline">
              <span className="font-medium text-slate-800 dark:text-slate-200">{company.ticker}</span>
              <span className="text-xs text-slate-500">{company.companyName}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{company.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
