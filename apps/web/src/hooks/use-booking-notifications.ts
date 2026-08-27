'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useNotificationsRealtime } from '@/hooks/use-notifications-realtime';
import {
  BOOKING_POLL_HIDDEN_MS,
  BOOKING_POLL_VISIBLE_MS,
  wsAwarePollIntervalMs,
} from '@/lib/live-attention';

export const BOOKING_ATTENTION_QUERY_KEY = ['notifications', 'booking-unread-count'] as const;

/**
 * Sifariş hadisələrinin sayını poll edir.
 * WS bağlı olanda seyrək fallback; invalidate `booking:status` / attention ilə.
 */
export function useBookingNotifications(enabled = true) {
  const token = useAuthToken();
  const { connected } = useNotificationsRealtime(enabled && !!token);

  const attentionQuery = useQuery({
    queryKey: BOOKING_ATTENTION_QUERY_KEY,
    queryFn: () => api.notifications.bookingUnreadCount(token!),
    enabled: enabled && !!token,
    refetchInterval: () =>
      wsAwarePollIntervalMs(connected, BOOKING_POLL_VISIBLE_MS, BOOKING_POLL_HIDDEN_MS),
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });

  const data = attentionQuery.data;

  return {
    attentionCount: data?.count ?? 0,
    latestUnreadId: data?.latestUnreadId ?? null,
    latestUnreadAt: data?.latestUnreadAt ?? null,
    latestTitle: data?.latestTitle ?? null,
    latestBody: data?.latestBody ?? null,
  };
}
