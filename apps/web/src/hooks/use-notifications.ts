'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useNotificationsRealtime } from '@/hooks/use-notifications-realtime';
import { WS_CONNECTED_FALLBACK_POLL_MS } from '@/lib/live-attention';

export const UNREAD_NOTIFICATIONS_QUERY_KEY = ['notifications', 'unread-count'] as const;
export const NOTIFICATIONS_QUERY_KEY = ['notifications', 'list'] as const;

const POLL_INTERVAL_MS = 30_000;

export function useNotifications(enabled = true) {
  const token = useAuthToken();
  const { connected } = useNotificationsRealtime(enabled && !!token);

  const unreadQuery = useQuery({
    queryKey: UNREAD_NOTIFICATIONS_QUERY_KEY,
    queryFn: () => api.notifications.unreadCount(token!),
    enabled: enabled && !!token,
    refetchInterval: connected ? WS_CONNECTED_FALLBACK_POLL_MS : POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });

  return {
    unreadCount: unreadQuery.data?.count ?? 0,
    latestUnreadId: unreadQuery.data?.latestUnreadId ?? null,
    latestUnreadAt: unreadQuery.data?.latestUnreadAt ?? null,
  };
}
