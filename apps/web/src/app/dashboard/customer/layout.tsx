'use client';

import { usePathname } from 'next/navigation';
import { UserRole } from '@xidmetal/shared';
import { RequireRole } from '@/components/auth/require-role';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { NotificationPermissionBanner } from '@/components/notifications/notification-permission-banner';
import { usePresenceHeartbeat } from '@/hooks/use-presence-heartbeat';
import { cn } from '@/lib/utils';

const FILL_VIEWPORT_ROUTES = ['/dashboard/customer/messages'];

export default function CustomerDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  usePresenceHeartbeat(true);
  const isFillViewport = FILL_VIEWPORT_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  return (
    <RequireRole role={UserRole.CUSTOMER}>
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        <NotificationPermissionBanner />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <DashboardSidebar variant="customer" />
          <main
            className={cn('min-h-0 flex-1', isFillViewport ? 'overflow-hidden' : 'overflow-y-auto')}
          >
            <div
              className={cn(
                'mx-auto max-w-6xl px-4 sm:px-6 lg:px-8',
                isFillViewport ? 'flex h-full min-h-0 flex-col py-4' : 'py-6',
              )}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </RequireRole>
  );
}
