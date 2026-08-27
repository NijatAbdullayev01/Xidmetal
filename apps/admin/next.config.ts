import path from 'path';
import type { NextConfig } from 'next';

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

const localPublicApp = isLocalPublicHost(process.env.NEXT_PUBLIC_ADMIN_URL);
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
  ].filter(Boolean);

  const httpMediaOrigins = [
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
    .filter((origin, index, all) => origin.startsWith('http:') && all.indexOf(origin) === index);

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    `img-src 'self' data: blob: https: ${httpMediaOrigins.join(' ')}`.trim(),
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline'" +
      (process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"),
    `connect-src ${connectSrc.join(' ')}`,
  ];

  if (process.env.NODE_ENV === 'production') {
    csp.push('upgrade-insecure-requests');
  }

  return [
    { key: 'Content-Security-Policy', value: csp.join('; ') },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
  ];
}

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['@xidmetal/shared'],
  images: {
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
        source: '/:path*',
        headers: buildSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;
