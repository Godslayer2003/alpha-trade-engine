import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Serves /dashboard's content at / directly (200), instead of a 307
  // redirect — crawlers that don't follow redirects (e.g. AdSense's
  // site-verification check) need to see the page — and real content —
  // right at the registered root URL.
  async rewrites() {
    return [{ source: '/', destination: '/dashboard' }];
  },
};

export default nextConfig;
