'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

const STORAGE_KEY = 'alpha-trade-disclaimer-dismissed';

export function DisclaimerBanner() {
  const { user } = useAuth();
  // null = not yet hydrated from localStorage; render nothing briefly rather
  // than flash the banner then hide it, or default-hide it for a first-time
  // visitor who's never actually dismissed it.
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  if (dismissed === null) return null;
  // Hidden while logged in (signing up already required agreeing to the
  // disclaimer via that form's checkbox) — but not persisted, so logging
  // out brings it back unless it was also dismissed manually.
  if (dismissed || user) return null;

  function confirmDismiss() {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  }

  return (
    <div className="mb-8 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative">
          <button
            onClick={confirmDismiss}
            aria-label="Dismiss disclaimer"
            className="absolute top-2 right-2 text-xs px-2 py-1 rounded text-rose-700 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-200 hover:bg-rose-200 dark:hover:bg-rose-900"
          >
            Dismiss
          </button>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 pr-16">
            Research and simulated trading · Not financial advice
          </p>
          <p className="text-xs text-slate-500 mt-2 pr-16">
            All trading decisions and their outcomes are your sole responsibility. See our{' '}
            <Link href="/disclaimer" className="underline hover:text-rose-900 dark:hover:text-rose-200">
              Disclaimer &amp; Terms
            </Link>.
          </p>
    </div>
  );
}
