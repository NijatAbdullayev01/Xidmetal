import type { ReactNode } from 'react';
import { AdminPanelLayout } from './admin-panel-layout';

export default function Layout({ children }: { children: ReactNode }) {
  return <AdminPanelLayout>{children}</AdminPanelLayout>;
}
