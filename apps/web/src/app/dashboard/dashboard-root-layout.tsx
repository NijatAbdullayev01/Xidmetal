'use client';

import { RequireAuth } from '@/components/auth/require-auth';
import { useNotificationsRealtime } from '@/hooks/use-notifications-realtime';

function DashboardRealtimeBridge({ children }: { children: React.ReactNode }) {
  useNotificationsRealtime(true);
  return <>{children}</>;
}

export function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DashboardRealtimeBridge>{children}</DashboardRealtimeBridge>
        </div>
      </div>
    </RequireAuth>
  );
}
