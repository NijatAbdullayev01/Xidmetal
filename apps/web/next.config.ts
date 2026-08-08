import path from 'path';
import type { NextConfig } from 'next';

// Monorepo root .env — NEXT_PUBLIC_* dəyişənləri (next-in daxili dotenv)
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const apiOrigin = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000'
).replace(/\/$/, '');

const nextConfig: NextConfig = {
  transpilePackages: ['@xidmetal/shared'],
  images: {
    // Next 16+: quality prop yalnız bu siyahıdakı dəyərlərlə uyğun olmalıdır
    qualities: [75, 100],
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiOrigin}/api/v1/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${apiOrigin}/uploads/:path*`,
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
