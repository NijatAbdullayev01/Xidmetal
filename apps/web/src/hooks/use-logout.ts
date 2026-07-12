'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';

/**
 * Zustand auth state-i təmizləməklə yanaşı TanStack Query keşini də sıfırlayır
 * ki, başqa istifadəçi eyni cihazda daxil olanda köhnə (əvvəlki hesaba aid)
 * data görünməsin.
 */
export function useLogout(): () => void {
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);

  return () => {
    logout();
    queryClient.clear();
  };
}
