import path from 'path';
import type { NextConfig } from 'next';

// Monorepo root .env — NEXT_PUBLIC_* dəyişənləri (next-in daxili dotenv)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dotenv = require('dotenv') as {
  config: (opts: { path: string }) => void;
};
const envDir = path.join(__dirname, '../..');
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(envDir, '.env.development') });
}
dotenv.config({ path: path.join(envDir, '.env') });

const apiOrigin =
  process.env.API_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim() || '';
const publicApiOrigin = process.env.NEXT_PUBLIC_API_URL?.trim() || '';
const wsOrigin = process.env.NEXT_PUBLIC_WS_URL?.trim() || '';
type RemotePattern = NonNullable<NonNullable<NextConfig['images']>['remotePatterns']>[number];

function localDevApiOrigin(): string {
  const fromEnv = process.env.API_URL?.trim() || process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      return 'http://localhost:4100';
    }
  }
  return 'http://localhost:4100';
}

function isLocalPublicHost(url: string | undefined): boolean {
  const value = url?.trim() ?? '';
  if (!value) return process.env.NODE_ENV !== 'production';
  try {
    const { hostname } = new URL(value);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return process.env.NODE_ENV !== 'production';
  }
}

const localPublicApp = isLocalPublicHost(process.env.NEXT_PUBLIC_APP_URL);
const localApiOrigin = localDevApiOrigin();

function buildImageRemotePatterns(): RemotePattern[] {
  const sources = [
    process.env.STORAGE_PUBLIC_BASE_URL,
    process.env.S3_PUBLIC_URL,
    apiOrigin ? `${apiOrigin.replace(/\/$/, '')}/uploads` : '',
    localPublicApp ? `${localApiOrigin}/uploads` : '',
  ];

  return sources
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .map((value) => {
      const url = new URL(value);
      const pathname = url.pathname.replace(/\/$/, '') || '/';
      return {
        protocol: url.protocol === 'https:' ? 'https' : 'http',
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
        pathname: `${pathname === '/' ? '' : pathname}/**`,
      } satisfies RemotePattern;
    });
}

function buildSecurityHeaders() {
  const connectSrc = [
    "'self'",
    publicApiOrigin.replace(/\/$/, ''),
    wsOrigin.replace(/\/$/, ''),
    localPublicApp ? localApiOrigin : '',
    localPublicApp ? localApiOrigin.replace(/^http/, 'ws') : '',
    'https://*.googleapis.com',
    'https://*.gstatic.com',
    'https://challenges.cloudflare.com',
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://region1.google-analytics.com',
    'https://*.analytics.google.com',
  ].filter(Boolean);

  const mediaOrigins = [
    process.env.STORAGE_PUBLIC_BASE_URL,
    process.env.S3_PUBLIC_URL,
    apiOrigin,
    publicApiOrigin,
    localPublicApp ? localApiOrigin : '',
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .map((value) => {
      try {
        return new URL(value).origin;
      } catch {
        return '';
      }
    })
    .filter((origin, index, all) => origin.length > 0 && all.indexOf(origin) === index);

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    `img-src 'self' data: blob: https://challenges.cloudflare.com https://www.google-analytics.com https://www.googletagmanager.com ${mediaOrigins.join(' ')}`.trim(),
    "font-src 'self' data: https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "script-src 'self' 'unsafe-inline'" +
      (process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'") +
      ' https://challenges.cloudflare.com https://www.googletagmanager.com',
    "frame-src 'self' https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    `connect-src ${connectSrc.join(' ')}`,
  ];

  if (process.env.NODE_ENV === 'production') {
    csp.push('upgrade-insecure-requests');
  }

  const headers = [
    { key: 'Content-Security-Policy', value: csp.join('; ') },
    { key: 'Permissions-Policy', value: 'geolocation=(self)' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
  ];

  if (process.env.NODE_ENV === 'production') {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains',
    });
  }

  return headers;
}

const nextConfig: NextConfig = {
  trailingSlash: false,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['@xidmetal/shared'],
  images: {
    // Next 16+: quality prop yalnız bu siyahıdakı dəyərlərlə uyğun olmalıdır
    qualities: [75, 100],
    remotePatterns: buildImageRemotePatterns(),
  },
  async rewrites() {
    if (!apiOrigin) return [];
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiOrigin.replace(/\/$/, '')}/api/v1/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${apiOrigin.replace(/\/$/, '')}/uploads/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/robots.txt',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/google3ca31a5fa705ff79.html',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/:path*',
        headers: buildSecurityHeaders(),
      },
    ];
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
