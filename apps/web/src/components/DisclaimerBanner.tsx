'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'alpha-trade-disclaimer-dismissed';

export function DisclaimerBanner() {
  // null = not yet hydrated from localStorage; render nothing briefly rather
  // than flash the banner then hide it, or default-hide it for a first-time
  // visitor who's never actually dismissed it.
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  if (dismissed === null || dismissed) return null;

  function confirmDismiss() {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  }

  return (
    <div className="mb-8 px-4 py-3 rounded-xl bg-rose-100 dark:bg-rose-950 border-2 border-rose-400 dark:border-rose-800 relative">
      {confirming ? (
        <div className="flex flex-col items-center gap-2 py-1">
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-400 text-center">
            Are you sure you have read the Disclaimer &amp; Terms of Use?
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmDismiss}
              className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
            >
              No
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={() => setConfirming(true)}
            aria-label="Dismiss disclaimer"
            className="absolute top-2 right-2 text-xs px-2 py-1 rounded text-rose-700 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-200 hover:bg-rose-200 dark:hover:bg-rose-900"
          >
            ✕ Dismiss
          </button>
          <p className="text-base sm:text-lg font-extrabold text-rose-700 dark:text-rose-400 text-center">
            Rules-based technical analysis — NOT FINANCIAL ADVICE
          </p>
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-400 text-center mt-1">
            All trading decisions and their outcomes are your sole responsibility. See our{' '}
            <Link href="/disclaimer" className="underline hover:text-rose-900 dark:hover:text-rose-200">
              Disclaimer &amp; Terms
            </Link>.
          </p>
        </>
      )}
    </div>
  );
}
