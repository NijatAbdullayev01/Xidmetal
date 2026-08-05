'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';

export function useLogout(): () => void {
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);

  return () => {
    logout();
    queryClient.clear();
  };
}
