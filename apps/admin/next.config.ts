import path from 'path';
import type { NextConfig } from 'next';

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const apiOrigin =
  process.env.API_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim() || '';
const wsOrigin = process.env.NEXT_PUBLIC_WS_URL?.trim() || '';
type RemotePattern = NonNullable<NonNullable<NextConfig['images']>['remotePatterns']>[number];

function buildImageRemotePatterns(): RemotePattern[] {
  const sources = [
    process.env.STORAGE_PUBLIC_BASE_URL,
    process.env.S3_PUBLIC_URL,
    apiOrigin ? `${apiOrigin.replace(/\/$/, '')}/uploads` : '',
    process.env.NODE_ENV === 'production' ? '' : 'http://localhost:4000/uploads',
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
    apiOrigin.replace(/\/$/, ''),
    wsOrigin.replace(/\/$/, ''),
    process.env.NODE_ENV === 'production' ? '' : 'http://localhost:4000',
    process.env.NODE_ENV === 'production' ? '' : 'ws://localhost:4000',
  ].filter(Boolean);

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
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
