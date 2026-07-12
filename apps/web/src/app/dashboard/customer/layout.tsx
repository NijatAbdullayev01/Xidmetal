'use client';

import { UserRole } from '@xidmetal/shared';
import { RequireRole } from '@/components/auth/require-role';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { cn } from '@/lib/utils';

export default function CustomerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role={UserRole.CUSTOMER}>
      <div className="flex h-[100dvh] flex-col overflow-hidden lg:flex-row">
        <DashboardSidebar variant="customer" />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className={cn('mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8')}>{children}</div>
        </main>
      </div>
    </RequireRole>
  );
}
