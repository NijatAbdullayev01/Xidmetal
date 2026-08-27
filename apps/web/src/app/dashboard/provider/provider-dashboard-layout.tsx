'use client';

import { usePathname } from 'next/navigation';
import { UserRole } from '@xidmetal/shared';
import { RequireRole } from '@/components/auth/require-role';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { ProviderPresenceSync } from '@/components/provider/provider-presence-sync';
import { ProviderTripLocationSync } from '@/components/provider/provider-trip-location-sync';
import { usePresenceHeartbeat } from '@/hooks/use-presence-heartbeat';
import { useDashboardPrefetch } from '@/hooks/use-dashboard-prefetch';
import { cn } from '@/lib/utils';

const FULL_WIDTH_ROUTES = ['/dashboard/provider/services/new'];
const FILL_VIEWPORT_ROUTES = ['/dashboard/provider/messages'];

export function ProviderDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  usePresenceHeartbeat(true);
  useDashboardPrefetch('provider');
  const isFullWidth = FULL_WIDTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isFillViewport = FILL_VIEWPORT_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  return (
    <RequireRole role={UserRole.PROVIDER}>
      <ProviderPresenceSync />
      <ProviderTripLocationSync />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <DashboardSidebar variant="provider" />
        <main
          className={cn('min-h-0 flex-1', isFillViewport ? 'overflow-hidden' : 'overflow-y-auto')}
        >
          <div
            className={cn(
              'px-4 sm:px-6 lg:px-8',
              isFullWidth ? 'w-full' : 'mx-auto max-w-6xl',
              isFillViewport ? 'flex h-full min-h-0 flex-col py-4' : 'py-6',
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </RequireRole>
  );
}
