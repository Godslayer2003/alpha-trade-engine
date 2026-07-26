'use client';

import { InvestmentStyle } from '@alpha-trade/shared-types';

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

export function StrategySelectorPanel({ value, onChange }: StrategySelectorPanelProps) {
  return (
    <div className="space-y-3">
      <label htmlFor="investment-style" className="block text-sm text-slate-400">
        Investment style
      </label>
      <select
        id="investment-style"
        value={value}
        onChange={(e) => onChange(e.target.value as InvestmentStyle)}
        className="w-full rounded-lg bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {Object.values(InvestmentStyle).map((style) => (
          <option key={style} value={style}>
            {STYLE_LABELS[style]}
          </option>
        ))}
      </select>
    </div>
  );
}
