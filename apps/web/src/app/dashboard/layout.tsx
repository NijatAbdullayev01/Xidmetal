'use client';

import { RequireAuth } from '@/components/auth/require-auth';
import { EmailVerifyBanner } from '@/components/auth/email-verify-banner';

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <EmailVerifyBanner />
      {children}
    </RequireAuth>
  );
}
