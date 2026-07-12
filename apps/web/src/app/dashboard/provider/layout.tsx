'use client';

import { usePathname } from 'next/navigation';
import { UserRole } from '@xidmetal/shared';
import { RequireRole } from '@/components/auth/require-role';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { cn } from '@/lib/utils';

const FULL_WIDTH_ROUTES = ['/dashboard/provider/services/new'];

export default function ProviderDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullWidth = FULL_WIDTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  return (
    <RequireRole role={UserRole.PROVIDER}>
      <div className="flex h-[100dvh] flex-col overflow-hidden lg:flex-row">
        <DashboardSidebar variant="provider" />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div
            className={cn(
              'px-4 py-6 sm:px-6 lg:px-8',
              isFullWidth ? 'w-full' : 'mx-auto max-w-6xl',
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </RequireRole>
  );
}
