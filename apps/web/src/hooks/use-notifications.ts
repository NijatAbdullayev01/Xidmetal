'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';

export const UNREAD_NOTIFICATIONS_QUERY_KEY = ['notifications', 'unread-count'] as const;
export const NOTIFICATIONS_QUERY_KEY = ['notifications', 'list'] as const;

const POLL_INTERVAL_MS = 8_000;

export function useNotifications(enabled = true) {
  const token = useAuthToken();

  const unreadQuery = useQuery({
    queryKey: UNREAD_NOTIFICATIONS_QUERY_KEY,
    queryFn: () => api.notifications.unreadCount(token!),
    enabled: enabled && !!token,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });

  return {
    unreadCount: unreadQuery.data?.count ?? 0,
  };
}
