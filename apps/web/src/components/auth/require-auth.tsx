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
  const isAuthenticated = useAuthStore((state) => !!state.tokens?.accessToken);
  const hydrated = useAuthHydrated();

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return <>{children}</>;
}
