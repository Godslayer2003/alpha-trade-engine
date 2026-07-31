'use client';

import { useEffect, useState } from 'react';
import { InvestmentStyle } from '@alpha-trade/shared-types';
import { fetchBrokerRecommendations, type BrokerMatch } from '@/lib/api-client';

interface BrokerRecommendationWidgetProps {
  style: InvestmentStyle;
}

export function BrokerRecommendationWidget({ style }: BrokerRecommendationWidgetProps) {
  const [matches, setMatches] = useState<BrokerMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchBrokerRecommendations(style)
      .then((result) => {
        if (!cancelled) setMatches(result);
      })
      .catch(() => {
        if (!cancelled) setError('Could not reach the API. Is apps/api running on ' + (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '?');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [style]);

  if (loading) return <p className="text-sm text-slate-500">Loading broker matches…</p>;
  if (error) return <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>;

  return (
    <ul className="space-y-3">
      {matches.map((match) => (
        <li key={match.brokerName} className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <div className="flex justify-between items-baseline">
            <span className="font-medium text-slate-800 dark:text-slate-200">{match.brokerName}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">{Math.round(match.matchScore * 100)}% match</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{match.reason}</p>
        </li>
      ))}
    </ul>
  );
}
