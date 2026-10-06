'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthPanel } from './AuthPanel';

const links = [['/dashboard', 'Markets'], ['/components', 'Tools'], ['/workflows', 'Workflows'], ['/onboarding', 'Risk profile'], ['/settings', 'Settings']] as const;
export function SiteNavigation() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return <header className="site-header">
    <nav aria-label="Main navigation" className="site-navigation">
      <Link href="/dashboard" aria-label="Alpha Trade home" className="site-brand">Alpha Trade<span className="hidden sm:inline"> / Engine</span></Link>
      <div className="hidden gap-5 text-sm lg:flex">{links.map(([href, label]) => <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined} className="site-link">{label}</Link>)}</div>
      <div className="flex min-w-0 items-center gap-2">
        <AuthPanel />
        <details className="relative lg:hidden"><summary className="menu-trigger">Menu</summary>
          <div className="menu-links">{links.map(([href, label]) => <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined} onClick={event => event.currentTarget.closest('details')?.removeAttribute('open')} className="site-link block px-3 py-2">{label}</Link>)}</div>
        </details>
      </div>
    </nav>
  </header>;
}
