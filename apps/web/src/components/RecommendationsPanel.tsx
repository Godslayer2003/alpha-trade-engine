'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  fetchRecommendations,
  generateRecommendations,
  type Recommendation,
} from '@/lib/api-client';

const DEAL_TYPE_STYLES: Record<string, string> = {
  LONG: 'text-emerald-400',
  SHORT: 'text-rose-400',
  NEUTRAL: 'text-slate-400',
};

const STYLE_LABELS: Record<string, string> = {
  SWING_TRADING: 'Swing Trading',
  WEEKEND_POSITIONING: 'Weekend Positioning',
  LONG_TERM_HOLD: 'Long-Term Hold',
  DAY_TRADING: 'Day Trading',
  OPTIONS_INCOME: 'Options Income',
};

export function RecommendationsPanel() {
  const { user, token } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsQuestionnaire, setNeedsQuestionnaire] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setRecommendations(await fetchRecommendations(token));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleGenerate() {
    if (!token) return;
    setGenerating(true);
    setError(null);
    setNeedsQuestionnaire(false);
    try {
      setRecommendations(await generateRecommendations(token));
    } catch (err) {
      const message = (err as Error).message;
      if (message.toLowerCase().includes('questionnaire')) {
        setNeedsQuestionnaire(true);
      } else {
        setError(message);
      }
    } finally {
      setGenerating(false);
    }
  }

  if (!user) {
    return (
      <p className="text-sm text-slate-500">
        Log in and complete the risk questionnaire to get personalized buy ideas with entry,
        stop, target, and a plain-language reason for each.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full text-sm px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
      >
        {generating ? 'Generating…' : 'Generate My Recommendations'}
      </button>

      {needsQuestionnaire && (
        <p className="text-xs text-amber-400">
          Complete the{' '}
          <Link href="/onboarding" className="underline">
            risk questionnaire
          </Link>{' '}
          first so this can be tailored to you.
        </p>
      )}
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {loading && recommendations.length === 0 && (
        <p className="text-xs text-slate-500">Loading…</p>
      )}

      {recommendations.length > 0 && (
        <ul className="space-y-3">
          {recommendations.map((r) => (
            <li key={r.id} className="border border-slate-800 rounded-lg p-3 text-xs">
              <div className="flex justify-between items-baseline">
                <span className="font-medium text-slate-200">{r.ticker}</span>
                <span className={`font-semibold ${DEAL_TYPE_STYLES[r.dealType] ?? 'text-slate-400'}`}>
                  {r.dealType}
                </span>
              </div>
              <p className="text-slate-500 mt-0.5">
                Entry {r.entryPrice}
                {r.stopLoss !== null && ` · Stop ${r.stopLoss}`}
                {r.targetPrice !== null && ` · Target ${r.targetPrice}`}
                {' · '}
                {STYLE_LABELS[r.horizonStyle] ?? r.horizonStyle}
              </p>
              <p className="text-slate-400 mt-1">{r.justification}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
