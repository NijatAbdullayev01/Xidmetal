'use client';

import { RequireAdmin } from '@/components/auth/require-admin';
import { AdminSidebar } from '@/components/layout/admin-sidebar';

export function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAdmin>
      <div className="flex h-[100dvh] flex-col overflow-hidden lg:flex-row">
        <AdminSidebar />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </RequireAdmin>
  );
}
