'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { updateProfile } from '@/lib/api-client';

const RISK_OPTIONS = [
  { value: 'CONSERVATIVE', label: 'Conservative — protect what I have, smaller swings' },
  { value: 'MODERATE', label: 'Moderate — balanced growth and risk' },
  { value: 'AGGRESSIVE', label: 'Aggressive — comfortable with big swings for bigger upside' },
];

const GOAL_OPTIONS = [
  'Grow wealth long-term',
  'Generate regular income',
  'Learn to trade with practice money',
  'Preserve capital, minimize risk',
];

const EXPERIENCE_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const { token } = useAuth();
  const router = useRouter();

  const [riskTolerance, setRiskTolerance] = useState('MODERATE');
  const [timeHorizonYears, setTimeHorizonYears] = useState('5');
  const [investmentGoal, setInvestmentGoal] = useState(GOAL_OPTIONS[0]);
  const [experienceLevel, setExperienceLevel] = useState(EXPERIENCE_OPTIONS[0]);
  const [capitalBase, setCapitalBase] = useState('10000');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile(token, {
        riskTolerance,
        timeHorizonYears: Number(timeHorizonYears),
        investmentGoal,
        experienceLevel,
        capitalBase: Number(capitalBase),
      });
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) return null;

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-slate-300">Log in first on the dashboard, then come back here.</p>
          <Link href="/dashboard" className="text-emerald-400 underline">
            Go to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6 flex justify-center">
      <div className="w-full max-w-lg space-y-6 py-10">
        <div>
          <h1 className="text-2xl font-bold text-emerald-400">Tell us about your investing</h1>
          <p className="text-sm text-slate-400 mt-1">
            A few questions so recommendations are matched to your risk tolerance and timeline —
            not generic advice.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Risk tolerance</label>
            {RISK_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="radio"
                  name="risk"
                  value={opt.value}
                  checked={riskTolerance === opt.value}
                  onChange={(e) => setRiskTolerance(e.target.value)}
                  className="accent-emerald-500"
                />
                {opt.label}
              </label>
            ))}
          </div>

          <div className="space-y-1">
            <label className="block text-sm text-slate-300">Investment horizon (years)</label>
            <input
              type="number"
              min="0"
              max="50"
              value={timeHorizonYears}
              onChange={(e) => setTimeHorizonYears(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm text-slate-300">Primary goal</label>
            <select
              value={investmentGoal}
              onChange={(e) => setInvestmentGoal(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {GOAL_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm text-slate-300">Experience level</label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {EXPERIENCE_OPTIONS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm text-slate-300">Capital base (reference only, $)</label>
            <input
              type="number"
              min="0"
              value={capitalBase}
              onChange={(e) => setCapitalBase(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 text-sm font-medium"
          >
            {saving ? 'Saving…' : 'Save and see my recommendations'}
          </button>
        </form>
      </div>
    </main>
  );
}
