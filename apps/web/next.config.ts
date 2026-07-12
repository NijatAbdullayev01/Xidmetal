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
};

export default nextConfig;
