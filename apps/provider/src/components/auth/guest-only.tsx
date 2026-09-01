'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useAuthHydrated } from '@/hooks/use-auth-hydrated';
import { getDashboardPath } from '@/lib/auth';

interface GuestOnlyProps {
  children: React.ReactNode;
}

export function GuestOnly({ children }: GuestOnlyProps) {
  const router = useRouter();
  // `tokens` birbaşa seçilir — `isAuthenticated()` funksiya referansı sabit
  // olduğu üçün Zustand state dəyişikliyini aşkarlaya bilmirdi.
  const isAuthenticated = useAuthStore((state) => state.session && !!state.user);
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthHydrated();

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      router.replace(user ? getDashboardPath(user.role) : '/');
    }
  }, [hydrated, isAuthenticated, user, router]);

  if (!hydrated || isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
