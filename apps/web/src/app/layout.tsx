import type { Metadata } from 'next';
import Script from 'next/script';
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
    <html lang="en" className="dark">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2856226090534119"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
