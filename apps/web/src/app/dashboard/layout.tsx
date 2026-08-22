import type { ReactNode } from 'react';
import { DashboardRootLayout } from './dashboard-root-layout';

export default function Layout({ children }: { children: ReactNode }) {
  return <DashboardRootLayout>{children}</DashboardRootLayout>;
}
