'use client';
import Link from 'next/link';

const links = [['/dashboard', 'Dashboard'], ['/components', 'Tools'], ['/settings', 'Settings'], ['/privacy', 'Privacy']] as const;
export function SiteNavigation() {
  return <header className="border-b border-slate-200 dark:border-slate-800">
    <nav aria-label="Main navigation" className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
      <Link href="/dashboard" className="font-semibold tracking-tight">Alpha-Trade Engine</Link>
      <div className="hidden gap-5 text-sm sm:flex">{links.map(([href, label]) => <Link key={href} href={href} className="hover:underline">{label}</Link>)}</div>
      <details className="relative sm:hidden"><summary className="cursor-pointer rounded-lg border px-3 py-2 text-sm">Menu</summary>
        <div className="absolute right-0 z-50 mt-2 min-w-40 rounded-lg border border-slate-300 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-950">{links.map(([href, label]) => <Link key={href} href={href} onClick={event => event.currentTarget.closest('details')?.removeAttribute('open')} className="block rounded px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">{label}</Link>)}</div>
      </details>
    </nav>
  </header>;
}
