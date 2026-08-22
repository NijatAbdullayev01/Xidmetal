'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useAuthHydrated } from '@/hooks/use-auth-hydrated';
import { getDashboardPath } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthHydrated();

  useEffect(() => {
    if (!hydrated) return;
    router.replace(user ? getDashboardPath(user.role) : '/login');
  }, [hydrated, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-brand" />
    </div>
  );
}
