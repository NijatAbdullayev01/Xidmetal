import path from 'path';
import type { NextConfig } from 'next';

// Monorepo root .env — NEXT_PUBLIC_* dəyişənləri (next-in daxili dotenv)
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const nextConfig: NextConfig = {
  transpilePackages: ['@xidmetal/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Next 15 default: dynamic segment staleTime = 0 → hər soft nav serverə gedir.
  // Qısa client router cache ilə geri/irəli və təkrar keçidlər anlıq olur.
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
