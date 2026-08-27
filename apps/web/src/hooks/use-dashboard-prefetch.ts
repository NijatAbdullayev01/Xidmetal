'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { DEFAULT_BOOKING_LIST_PARAMS } from '@/lib/booking-list-query';

/**
 * Kabinet layout-u mount olanda növbəti səhifələrin datası keşə düşür —
 * klikdən sonra boş spinner gözləməmək üçün.
 */
export function useDashboardPrefetch(variant: 'provider' | 'customer') {
  const token = useAuthToken();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return;

    void queryClient.prefetchQuery({
      queryKey: ['users', 'me'],
      queryFn: () => api.users.me(token),
    });
    void queryClient.prefetchQuery({
      queryKey: ['conversations'],
      queryFn: () => api.messages.conversations(token, { limit: '100' }),
    });

    if (variant === 'provider') {
      void queryClient.prefetchQuery({
        queryKey: ['users', 'dashboard-stats'],
        queryFn: () => api.users.dashboardStats(token),
      });
      void queryClient.prefetchQuery({
        queryKey: ['services', 'mine'],
        queryFn: () => api.myServices(token, { limit: '50' }),
      });
      void queryClient.prefetchQuery({
        queryKey: ['bookings', 'provider', DEFAULT_BOOKING_LIST_PARAMS],
        queryFn: () => api.bookings(token, DEFAULT_BOOKING_LIST_PARAMS),
      });
      return;
    }

    void queryClient.prefetchQuery({
      queryKey: ['bookings', DEFAULT_BOOKING_LIST_PARAMS],
      queryFn: () => api.bookings(token, DEFAULT_BOOKING_LIST_PARAMS),
    });
  }, [token, variant, queryClient]);
}
