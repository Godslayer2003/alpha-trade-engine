import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-context';

export const metadata: Metadata = {
  title: 'Alpha-Trade Engine',
  description: 'Technical pattern recognition and risk-managed trade guidance.',
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
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
