'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { UserRole } from '@xidmetal/shared';
import { useAuthStore } from '@/store/auth.store';
import { getDashboardPath } from '@/lib/auth';

interface RequireRoleProps {
  role: UserRole;
  children: React.ReactNode;
}

export function RequireRole({ role, children }: RequireRoleProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore.persist.hasHydrated();

  useEffect(() => {
    if (hydrated && user && user.role !== role) {
      router.replace(getDashboardPath(user.role));
    }
  }, [hydrated, user, role, router]);

  if (!hydrated || !user || user.role !== role) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return <>{children}</>;
}
