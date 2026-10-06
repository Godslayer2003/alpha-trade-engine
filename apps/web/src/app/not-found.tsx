import Link from 'next/link';
export default function NotFound() {
  return <main className="mx-auto max-w-3xl px-4 py-20">
    <p className="text-sm text-slate-600 dark:text-slate-400">404</p>
    <h1 className="mt-3 text-3xl font-semibold">Page not found</h1>
    <p className="mt-4">This address does not match a page in Alpha-Trade Engine.</p>
    <Link href="/dashboard" className="mt-6 inline-block rounded-lg bg-emerald-700 px-4 py-2 text-white">Return to dashboard</Link>
  </main>;
}
