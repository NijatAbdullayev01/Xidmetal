'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@xidmetal/shared';
import { useAuthStore } from '@/store/auth.store';
import { getDashboardPath } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore.persist.hasHydrated();

  useEffect(() => {
    if (hydrated && user) {
      router.replace(getDashboardPath(user.role));
    }
  }, [hydrated, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-brand" />
    </div>
  );
}
