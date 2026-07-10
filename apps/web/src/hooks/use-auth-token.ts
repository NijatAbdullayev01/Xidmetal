'use client';

import { useAuthStore } from '@/store/auth.store';

export function useAuthToken(): string {
  const tokens = useAuthStore((state) => state.tokens);
  if (!tokens?.accessToken) {
    throw new Error('Autentifikasiya tələb olunur');
  }
  return tokens.accessToken;
}
