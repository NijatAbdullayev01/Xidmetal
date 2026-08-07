'use client';

import { RequireAuth } from '@/components/auth/require-auth';
import { EmailVerifyBanner } from '@/components/auth/email-verify-banner';
import { useNotificationsRealtime } from '@/hooks/use-notifications-realtime';

function DashboardRealtimeBridge({ children }: { children: React.ReactNode }) {
  useNotificationsRealtime(true);
  return <>{children}</>;
}

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        <EmailVerifyBanner />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DashboardRealtimeBridge>{children}</DashboardRealtimeBridge>
        </div>
      </div>
    </RequireAuth>
  );
}
