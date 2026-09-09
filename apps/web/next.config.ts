import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The browser always calls this app through its own origin. Vercel proxies
  // the request to Render server-side, so adding or replacing a Vercel domain
  // never requires a matching CORS change on the API service.
  //
  // NEXT_PUBLIC_API_URL already holds the stable Render API origin in Vercel
  // and is only used here at build time as the rewrite destination.
  // Serves /dashboard's content at / directly (200), instead of a 307
  // redirect — crawlers that don't follow redirects (e.g. AdSense's
  // site-verification check) need to see the page — and real content —
  // right at the registered root URL.
  async rewrites() {
    const backendApiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
    return [
      { source: '/', destination: '/dashboard' },
      { source: '/backend/:path*', destination: `${backendApiUrl}/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          // This deliberately limits only embedding/plugin behavior. A full
          // script-src policy needs nonce support and would otherwise break
          // Next's required inline bootstrapping scripts.
          { key: 'Content-Security-Policy', value: "base-uri 'self'; frame-ancestors 'none'; object-src 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;
