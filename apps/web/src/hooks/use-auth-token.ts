'use client';

import { useAuthStore } from '@/store/auth.store';
import { useAuthHydrated } from '@/hooks/use-auth-hydrated';

export function useAuthToken(): string | null {
  const hydrated = useAuthHydrated();
  const accessToken = useAuthStore((state) => state.tokens?.accessToken ?? null);

  if (!hydrated) {
    return null;
  }

  return accessToken;
}
