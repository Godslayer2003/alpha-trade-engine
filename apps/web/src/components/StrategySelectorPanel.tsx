'use client';

import { useCallback, useEffect, useState } from 'react';
import { InvestmentStyle } from '@alpha-trade/shared-types';
import { useAuth } from '@/lib/auth-context';
import {
  createStrategy,
  deleteStrategy,
  fetchStrategies,
  updateStrategy,
  type Strategy,
} from '@/lib/api-client';

const STYLE_LABELS: Record<InvestmentStyle, string> = {
  [InvestmentStyle.SWING_TRADING]: 'Swing Trading',
  [InvestmentStyle.WEEKEND_POSITIONING]: 'Weekend Positioning',
  [InvestmentStyle.LONG_TERM_HOLD]: 'Long-Term Hold',
  [InvestmentStyle.DAY_TRADING]: 'Day Trading',
  [InvestmentStyle.OPTIONS_INCOME]: 'Options Income',
};

interface StrategySelectorPanelProps {
  value: InvestmentStyle;
  onChange: (style: InvestmentStyle) => void;
}

const emptyForm = {
  name: '',
  style: InvestmentStyle.SWING_TRADING as InvestmentStyle,
  preferredTickers: '',
  maxRiskPerTrade: '2',
  notes: '',
};

export function StrategySelectorPanel({ value, onChange }: StrategySelectorPanelProps) {
  const { user, token } = useAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setStrategies(await fetchStrategies(token));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleCreate() {
    if (!token || !form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createStrategy(token, {
        name: form.name.trim(),
        style: form.style,
        preferredTickers: form.preferredTickers
          .split(',')
          .map((t) => t.trim().toUpperCase())
          .filter(Boolean),
        maxRiskPerTrade: (Number(form.maxRiskPerTrade) || 2) / 100,
        notes: form.notes.trim() || undefined,
      });
      setStrategies((prev) => [created, ...prev]);
      setForm(emptyForm);
      setShowForm(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    setError(null);
    try {
      await deleteStrategy(token, id);
      setStrategies((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleToggleActive(strategy: Strategy) {
    if (!token) return;
    try {
      const updated = await updateStrategy(token, strategy.id, { isActive: !strategy.isActive });
      setStrategies((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="investment-style" className="block text-sm text-slate-600 dark:text-slate-400">
          Active style
        </label>
        <select
          id="investment-style"
          value={value}
          onChange={(e) => onChange(e.target.value as InvestmentStyle)}
          className="w-full rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {Object.values(InvestmentStyle).map((style) => (
            <option key={style} value={style}>
              {STYLE_LABELS[style]}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500">
          Drives the sector, broker, and recommendation panels below.
        </p>
      </div>

      {!user ? (
        <p className="text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800 pt-3">
          Log in to save named custom strategies (a watchlist + risk limit tied to a style) that
          you can switch between.
        </p>
      ) : (
        <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">My strategies</span>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="text-xs px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700"
            >
              {showForm ? 'Cancel' : '+ New strategy'}
            </button>
          </div>

          {loading && strategies.length === 0 && (
            <p className="text-xs text-slate-500">Loading strategies…</p>
          )}
          {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}

          {showForm && (
            <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Strategy name (e.g. Tech Momentum)"
                className="w-full rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <select
                value={form.style}
                onChange={(e) => setForm((f) => ({ ...f, style: e.target.value as InvestmentStyle }))}
                className="w-full rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {Object.values(InvestmentStyle).map((style) => (
                  <option key={style} value={style}>
                    {STYLE_LABELS[style]}
                  </option>
                ))}
              </select>
              <input
                value={form.preferredTickers}
                onChange={(e) => setForm((f) => ({ ...f, preferredTickers: e.target.value }))}
                placeholder="Watchlist tickers, comma-separated (e.g. NVDA, MSFT)"
                className="w-full rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 whitespace-nowrap">Max risk/trade</span>
                <input
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={form.maxRiskPerTrade}
                  onChange={(e) => setForm((f) => ({ ...f, maxRiskPerTrade: e.target.value }))}
                  className="w-20 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-500">%</span>
              </div>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Notes (optional)"
                rows={2}
                className="w-full rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleCreate}
                disabled={saving || !form.name.trim()}
                className="w-full text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
              >
                {saving ? 'Saving…' : 'Save strategy'}
              </button>
            </div>
          )}

          {strategies.length > 0 && (
            <ul className="space-y-2">
              {strategies.map((s) => (
                <li key={s.id} className="border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{s.name}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{STYLE_LABELS[s.style as InvestmentStyle]}</span>
                  </div>
                  {s.preferredTickers.length > 0 && (
                    <p className="text-slate-500 mt-0.5">Watching {s.preferredTickers.join(', ')}</p>
                  )}
                  <p className="text-slate-500 mt-0.5">
                    Max risk {(s.maxRiskPerTrade * 100).toFixed(1)}% per trade
                  </p>
                  {s.notes && <p className="text-slate-500 mt-0.5 italic">{s.notes}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => onChange(s.style as InvestmentStyle)}
                      className="px-2 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      Use
                    </button>
                    <button
                      onClick={() => handleToggleActive(s)}
                      className="px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700"
                    >
                      {s.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-slate-300 dark:hover:bg-slate-700"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
