import type { ReactNode } from 'react';
import { CustomerDashboardLayout } from './customer-dashboard-layout';

export default function Layout({ children }: { children: ReactNode }) {
  return <CustomerDashboardLayout>{children}</CustomerDashboardLayout>;
}
