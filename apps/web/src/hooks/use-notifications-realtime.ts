'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { REALTIME_EVENTS } from '@xidmetal/shared';
import { getSharedSocket, useSocket } from '@/hooks/use-socket';
import {
  NOTIFICATIONS_QUERY_KEY,
  UNREAD_NOTIFICATIONS_QUERY_KEY,
} from '@/hooks/use-notifications';

/**
 * WS `notification:new` → inbox/unread invalidate (polling fallback saxlanılır).
 */
export function useNotificationsRealtime(enabled = true): { connected: boolean } {
  const { connected } = useSocket(enabled);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!connected) return;
    const socket = getSharedSocket();
    if (!socket) return;

    const onNotification = () => {
      void queryClient.invalidateQueries({ queryKey: UNREAD_NOTIFICATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'booking-unread-count'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'review-unread-count'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'service-unread-count'] });
      void queryClient.invalidateQueries({ queryKey: ['services', 'mine'] });
      void queryClient.invalidateQueries({ queryKey: ['users', 'dashboard-stats'] });
    };

    socket.on(REALTIME_EVENTS.NOTIFICATION_NEW, onNotification);
    return () => {
      socket.off(REALTIME_EVENTS.NOTIFICATION_NEW, onNotification);
    };
  }, [connected, queryClient]);

  return { connected };
}
