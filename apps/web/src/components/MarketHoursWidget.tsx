'use client';

import { useEffect, useState } from 'react';
import { MarketCountry, MarketHoursStatus } from '@alpha-trade/shared-types';
import { fetchMarketHours } from '@/lib/api-client';

const COUNTRY_LABELS: Record<MarketCountry, string> = {
  [MarketCountry.USA]: 'USA',
  [MarketCountry.CANADA]: 'Canada',
  [MarketCountry.UK]: 'UK',
  [MarketCountry.GERMANY]: 'Germany',
  [MarketCountry.FRANCE]: 'France',
  [MarketCountry.CHINA]: 'China',
  [MarketCountry.JAPAN]: 'Japan',
  [MarketCountry.KOREA]: 'South Korea',
  [MarketCountry.RUSSIA]: 'Russia',
  [MarketCountry.SOUTH_AFRICA]: 'South Africa',
  [MarketCountry.ARGENTINA]: 'Argentina',
  [MarketCountry.AUSTRALIA]: 'Australia',
};

const DEFAULT_SELECTED = new Set<MarketCountry>([MarketCountry.USA, MarketCountry.CANADA]);
const REFRESH_INTERVAL_MS = 60_000;

export function MarketHoursWidget() {
  const [statuses, setStatuses] = useState<MarketHoursStatus[]>([]);
  const [selected, setSelected] = useState<Set<MarketCountry>>(DEFAULT_SELECTED);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    function load() {
      fetchMarketHours()
        .then((result) => {
          if (!cancelled) {
            setStatuses(result);
            setError(null);
          }
        })
        .catch(() => {
          if (!cancelled) setError('Could not reach the API for market hours.');
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

  function toggle(country: MarketCountry) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(country)) next.delete(country);
      else next.add(country);
      return next;
    });
  }

  const visible = statuses.filter((s) => selected.has(s.country));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {Object.values(MarketCountry).map((country) => {
          const isOn = selected.has(country);
          return (
            <button
              key={country}
              onClick={() => toggle(country)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                isOn
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {COUNTRY_LABELS[country]}
            </button>
          );
        })}
      </div>

      {loading && <p className="text-sm text-slate-500">Loading market hours…</p>}
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      {!loading && !error && visible.length === 0 && (
        <p className="text-sm text-slate-500">Toggle a country above to see its market hours.</p>
      )}

      <ul className="space-y-2">
        {visible.map((status) => (
          <li
            key={status.country}
            className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex items-center justify-between gap-3"
          >
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {status.countryLabel}
                </span>
                <span className="text-xs text-slate-500">{status.exchangeName}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {status.sessionsLocal.map((s) => `${s.opens}–${s.closes}`).join(', ')} local ·{' '}
                {status.currentLocalTime} now
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{status.nextTransition.localLabel}</p>
            </div>
            <span
              className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                status.isOpen
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
              }`}
            >
              {status.isOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </li>
        ))}
      </ul>

      {visible.length > 0 && (
        <p className="text-[11px] text-slate-400 dark:text-slate-600">{visible[0].disclaimer}</p>
      )}
    </div>
  );
}
