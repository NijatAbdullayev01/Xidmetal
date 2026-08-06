'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

/**
 * Serverdə httpOnly cookie sessiyasını ləğv edir, sonra lokal state + keşi sıfırlayır.
 */
export function useLogout(): () => void {
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);

  return () => {
    void api.auth.logout().catch(() => {
      // Şəbəkə xətası çıxışı bloklamamalıdır
    });
    logout();
    queryClient.clear();
  };
}
