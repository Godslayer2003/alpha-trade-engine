import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-context';
import Link from 'next/link';
import { SiteNavigation } from '@/components/SiteNavigation';

export const metadata: Metadata = {
  title: { default: 'Alpha-Trade Engine | Market research and paper trading', template: '%s | Alpha-Trade Engine' },
  description: 'Explore market charts, educational technical analysis and simulated portfolios. Review risks before making any investment decision.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Matches ThemeProvider's default ('dark') so there's no flash for the
    // common case; ThemeProvider corrects this on mount if the user has
    // saved a 'light' preference.
    //
    // AdSense's sitewide auto-ads script was removed here — Google rejected
    // the site because auto-ads were being placed on plain app/utility
    // screens (settings, dashboard controls, etc.) with no real written
    // content, which violates their "ads on screens without
    // publisher-content" policy. Don't re-add the adsbygoogle.js script
    // globally; if ads are wanted later, they belong only on a genuine
    // content page (e.g. a blog/marketing page), not the app itself.
    <html lang="en" className="dark">
      <body className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50">
        <ThemeProvider>
          <AuthProvider>
            <a href="#page-content" className="skip-link">Skip to content</a>
            <SiteNavigation />
            <div id="page-content" tabIndex={-1}>{children}</div>
            <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-6 text-sm dark:border-slate-800">
              <span>© {new Date().getUTCFullYear()} Alpha-Trade Engine</span>
              <nav aria-label="Legal information" className="flex gap-5"><Link href="/privacy" className="underline">Privacy</Link><Link href="/disclaimer" className="underline">Terms and risk disclosure</Link></nav>
            </footer>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
