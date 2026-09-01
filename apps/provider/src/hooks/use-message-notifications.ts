'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useMessagesRealtime } from '@/hooks/use-messages-realtime';
import {
  LIVE_POLL_HIDDEN_MS,
  LIVE_POLL_VISIBLE_MS,
  wsAwarePollIntervalMs,
} from '@/lib/live-attention';

export const UNREAD_MESSAGES_QUERY_KEY = ['messages', 'unread-count'] as const;

/**
 * Oxunmamış mesaj sayını poll edir (+ WS `message:new` invalidate).
 * WS bağlı → 90s safety-net; əsas yol WS.
 */
export function useMessageNotifications(enabled = true) {
  const token = useAuthToken();
  const { connected } = useMessagesRealtime(enabled && !!token);

  const { data } = useQuery({
    queryKey: UNREAD_MESSAGES_QUERY_KEY,
    queryFn: () => api.messages.unreadCount(token!),
    enabled: enabled && !!token,
    refetchInterval: () =>
      wsAwarePollIntervalMs(connected, LIVE_POLL_VISIBLE_MS, LIVE_POLL_HIDDEN_MS),
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });

  return {
    unreadCount: data?.count ?? 0,
    latestUnreadMessageId: data?.latestUnreadMessageId ?? null,
    latestUnreadAt: data?.latestUnreadAt ?? null,
  };
}
