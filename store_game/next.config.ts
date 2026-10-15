import type { NextConfig } from 'next'

/**
 * Next.js version is pinned explicitly in package.json (F-03).
 * The config below targets the Next 15.5 API surface:
 *  - `revalidateTag(tag, 'max')` — two-argument form (C-38)
 *  - `revalidatePath(path, 'layout')` — two-argument form
 *  - `generateSitemaps` in src/app/sitemap.ts (F-11)
 *  - `params` / `searchParams` as Promises (C-21)
 * Do not copy examples written for Next 16: middleware was renamed there
 * and several config keys moved. (F-17)
 */

/** Hostname of the project that `NEXT_PUBLIC_SUPABASE_URL` points at (C-44). */
function hostnameOf(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback
  try {
    return new URL(raw).hostname
  } catch {
    return fallback
  }
}

const SUPABASE_HOST = hostnameOf(process.env.NEXT_PUBLIC_SUPABASE_URL, 'vwoxglwkjzktuekjnfsj.supabase.co')
const E2E_HOST = hostnameOf(process.env.SUPABASE_E2E_URL, '127.0.0.1')

const isDev = process.env.NODE_ENV === 'development'

/** Storage object paths served from the Supabase CDN. Must match F-04: the
 *  path stored in the database is bucket-relative, the bucket is prepended
 *  only when building a URL. */
const STORAGE_PATHNAME = '/storage/v1/object/public/**'

const CSP = [
  "default-src 'self'",
  // 'unsafe-inline' is required: App Router inlines its bootstrap script and
  // Tailwind v4 injects style tags. This is an accepted constraint of the
  // framework, not an oversight.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: https://*.supabase.co https://*.supabase.in${isDev ? ' http://localhost:* http://127.0.0.1:*' : ''}`,
  "font-src 'self' data:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${isDev ? ' ws://localhost:* http://localhost:* ws://127.0.0.1:*' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'self'", // live preview iframe on /admin/appearance (C-37)
  "worker-src 'self' blob:",
].join('; ')

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // href values come from the database and the route registry, so they cannot
  // be statically checked. Typing them as `Route` would be a lie. (C-23)
  typedRoutes: false,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: SUPABASE_HOST, pathname: STORAGE_PATHNAME },
      ...(E2E_HOST !== SUPABASE_HOST
        ? [{ protocol: 'http' as const, hostname: E2E_HOST, port: '54321', pathname: STORAGE_PATHNAME }]
        : []),
    ],
    formats: ['image/avif', 'image/webp'],
  },

  experimental: {
    serverActions: {
      // 5 files × 3.5 MB plus multipart overhead (C-28)
      bodySizeLimit: '20mb',
    },
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          { key: 'Content-Security-Policy', value: CSP },
        ],
      },
      // F-12: the noindex signal during maintenance is delivered through
      // <meta name="robots"> emitted by the public layout, because a layout
      // cannot set response headers. The static header below covers the
      // machine-readable entry points instead.
      { source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ]
  },
}

export default nextConfig
