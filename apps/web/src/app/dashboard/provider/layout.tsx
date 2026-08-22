import type { ReactNode } from 'react';
import { ProviderDashboardLayout } from './provider-dashboard-layout';

export default function Layout({ children }: { children: ReactNode }) {
  return <ProviderDashboardLayout>{children}</ProviderDashboardLayout>;
}
