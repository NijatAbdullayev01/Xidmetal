'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ProviderAvailability, UserRole } from '@xidmetal/shared';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

/**
 * Serverdə httpOnly cookie sessiyasını ləğv edir, sonra lokal state + keşi sıfırlayır.
 * Xidmət verən çıxışdan əvvəl oflayn edilir.
 */
export function useLogout(): () => void {
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);

  return () => {
    const user = useAuthStore.getState().user;

    const finish = () => {
      void api.auth.logout().catch(() => {
        // Şəbəkə xətası çıxışı bloklamamalıdır
      });
      logout();
      queryClient.clear();
    };

    if (user?.role === UserRole.PROVIDER) {
      void api.geo
        .updateAvailability('session', ProviderAvailability.OFFLINE)
        .catch(() => {
          /* çıxış bloklanmamalıdır */
        })
        .finally(finish);
      return;
    }

    finish();
  };
}
