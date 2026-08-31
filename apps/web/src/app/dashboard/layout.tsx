import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { DashboardRootLayout } from './dashboard-root-layout';
import { NOINDEX } from '@/lib/seo';

export const metadata: Metadata = {
  robots: NOINDEX,
};

export default function Layout({ children }: { children: ReactNode }) {
  return <DashboardRootLayout>{children}</DashboardRootLayout>;
}
