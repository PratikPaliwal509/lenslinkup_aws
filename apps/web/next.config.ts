import type { NextConfig } from 'next'

// When building for Capacitor (NEXT_OUTPUT=export npm run build:mobile),
// Next.js generates a fully-static `out/` folder that Capacitor bundles into
// the native app.  For web-only / Vercel deployments, output stays default
// (server-side rendering enabled).
const isCapacitorBuild = process.env.NEXT_OUTPUT === 'export'

// NEXT_PUBLIC_API_URL  = what the *browser* uses as the axios baseURL
//   • dev (web):  '' (empty) → axios makes relative /api/* calls → same-origin, no CORS
//   • Capacitor:  https://api.lenslinkup.in (absolute, set in Capacitor build env)
//   • prod Vercel: https://api.lenslinkup.in
//
// INTERNAL_API_URL = where the Next.js *server process* forwards /api/* rewrites
//   • Always the real Fastify API port (never the same as the web port)
const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? 'http://35.154.114.186:4000'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Static export only when building for mobile
  ...(isCapacitorBuild ? { output: 'export' } : {}),

  images: {
    // Allow S3-hosted images in production — update with your S3 hostname
    domains: ['localhost', 's3.amazonaws.com'],
    // Static export requires unoptimized images (no Next.js image server)
    ...(isCapacitorBuild ? { unoptimized: true } : {}),
  },

  // Rewrite proxy: /api/* → Fastify API server
  // Browser makes same-origin calls → Next.js server forwards to port 4000.
  // Not needed for Capacitor (mobile uses absolute URL directly).
  async rewrites() {
    if (isCapacitorBuild) return []
    return [
      {
        source:      '/api/:path*',
        destination: `${INTERNAL_API_URL}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
