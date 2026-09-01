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

export const REVIEW_ATTENTION_QUERY_KEY = ['notifications', 'review-unread-count'] as const;

export function useReviewNotifications(enabled = true) {
  const token = useAuthToken();
  const { connected } = useNotificationsRealtime(enabled && !!token);

  const attentionQuery = useQuery({
    queryKey: REVIEW_ATTENTION_QUERY_KEY,
    queryFn: () => api.notifications.reviewUnreadCount(token!),
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
  };
}
