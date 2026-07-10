'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

interface GuestOnlyProps {
  children: React.ReactNode;
}

export function GuestOnly({ children }: GuestOnlyProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated()) {
    return null;
  }

  return <>{children}</>;
}
