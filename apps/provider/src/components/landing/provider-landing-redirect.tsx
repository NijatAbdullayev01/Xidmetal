'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useAuthHydrated } from '@/hooks/use-auth-hydrated';
import { getDashboardPath } from '@/lib/auth';

/**
 * Landing yalnız qonaqlar üçündür. Artıq daxil olmuş xidmət verən dərhal
 * öz kabinetinə yönləndirilir — marketing məzmunu boş yerə göstərilmir.
 */
export function ProviderLandingRedirect() {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const isAuthenticated = useAuthStore((state) => state.session && !!state.user);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !user) return;
    router.replace(
      user.isVerified ? getDashboardPath(user.role) : '/verify-email',
    );
  }, [hydrated, isAuthenticated, user, router]);

  return null;
}
