'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import {
  BOOKING_POLL_HIDDEN_MS,
  BOOKING_POLL_VISIBLE_MS,
  livePollIntervalMs,
} from '@/lib/live-attention';

export const BOOKING_ATTENTION_QUERY_KEY = ['notifications', 'booking-unread-count'] as const;

/**
 * Sifariş hadisələrinin sayını poll edir.
 * Səs / toast / OS bildirişi yalnız `useLiveAttention` (AttentionProvider) tərəfindən verilir.
 */
export function useBookingNotifications(enabled = true) {
  const token = useAuthToken();

  const attentionQuery = useQuery({
    queryKey: BOOKING_ATTENTION_QUERY_KEY,
    queryFn: () => api.notifications.bookingUnreadCount(token!),
    enabled: enabled && !!token,
    refetchInterval: () => livePollIntervalMs(BOOKING_POLL_VISIBLE_MS, BOOKING_POLL_HIDDEN_MS),
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 2_000,
  });

  const data = attentionQuery.data;

  return {
    attentionCount: data?.count ?? 0,
    latestUnreadId: data?.latestUnreadId ?? null,
    latestUnreadAt: data?.latestUnreadAt ?? null,
  };
}
