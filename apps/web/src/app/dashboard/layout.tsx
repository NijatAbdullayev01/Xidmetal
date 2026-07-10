'use client';

import { RequireAuth } from '@/components/auth/require-auth';
import { QueryProvider } from '@/components/providers/query-provider';

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <RequireAuth>{children}</RequireAuth>
    </QueryProvider>
  );
}
