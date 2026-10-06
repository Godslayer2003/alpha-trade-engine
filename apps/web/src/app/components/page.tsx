import Link from 'next/link';
const tools = [
  { name: 'Market data', description: 'Look up a quote and inspect its source.', href: '/components/market-data-lookup' },
  { name: 'Research workspace', description: 'Explore charts, market news and asset analysis.', href: '/dashboard' },
  { name: 'Risk profile', description: 'Set your preferences before exploring strategy ideas.', href: '/onboarding' },
  { name: 'Notifications', description: 'Manage your report schedule and Telegram connection.', href: '/settings' },
];
export default function ToolsPage() {
  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-10 text-slate-900 dark:text-slate-100">
    <Link href="/dashboard" className="text-sm text-emerald-600 dark:text-emerald-400">← Dashboard</Link>
    <h1 className="mt-6 text-3xl font-semibold tracking-tight">Tools</h1>
    <p className="mt-2 text-slate-500">Research markets, refine your preferences and manage your account.</p>
    <div className="mt-8 grid gap-4 sm:grid-cols-2">{tools.map(tool => <Link key={tool.href} href={tool.href}
      className="rounded-xl border border-slate-200 p-6 transition hover:border-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 dark:border-slate-800">
      <h2 className="text-lg font-semibold">{tool.name}</h2><p className="mt-2 text-sm text-slate-500">{tool.description}</p>
      <span className="mt-5 block text-sm text-emerald-600 dark:text-emerald-400">Open tool →</span>
    </Link>)}</div>
  </main>;
}
