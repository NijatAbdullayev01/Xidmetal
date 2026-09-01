'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useAuthHydrated } from '@/hooks/use-auth-hydrated';

interface RequireAuthProps {
  children: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  // `tokens` birbaşa seçilir — `isAuthenticated()` funksiya referansı sabit
  // olduğu üçün Zustand onun dəyişməsini aşkarlaya bilmirdi (logout-dan sonra
  // yenidən render olunmurdu).
  const isAuthenticated = useAuthStore((state) => state.session && !!state.user);
  const isVerified = useAuthStore((state) => state.user?.isVerified === true);
  const hydrated = useAuthHydrated();

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (!isVerified) {
      router.replace('/verify-email');
    }
  }, [hydrated, isAuthenticated, isVerified, router]);

  if (!hydrated || !isAuthenticated || !isVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return <>{children}</>;
}
