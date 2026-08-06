'use client';

import { useAuthStore } from '@/store/auth.store';
import { useAuthHydrated } from '@/hooks/use-auth-hydrated';

/** Cookie sessiyası aktivdirsə truthy qaytarır (token localStorage-da yoxdur). */
export function useAuthToken(): string | null {
  const hydrated = useAuthHydrated();
  const session = useAuthStore((state) => state.session);
  const user = useAuthStore((state) => state.user);

  if (!hydrated || !session || !user) {
    return null;
  }

  return 'session';
}
