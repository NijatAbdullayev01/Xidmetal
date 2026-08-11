'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { REALTIME_EVENTS } from '@xidmetal/shared';
import { getSharedSocket, useSocket } from '@/hooks/use-socket';

/**
 * Sifariş statusu / bildiriş gələndə bookings və notifications query invalidate.
 */
export function useBookingsRealtimeInvalidation(enabled = true): { connected: boolean } {
  const { connected } = useSocket(enabled);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!connected) return;
    const socket = getSharedSocket();
    if (!socket) return;

    const onStatus = () => {
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
    };
    const onNotification = () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on(REALTIME_EVENTS.BOOKING_STATUS, onStatus);
    socket.on(REALTIME_EVENTS.NOTIFICATION_NEW, onNotification);

    return () => {
      socket.off(REALTIME_EVENTS.BOOKING_STATUS, onStatus);
      socket.off(REALTIME_EVENTS.NOTIFICATION_NEW, onNotification);
    };
  }, [connected, queryClient]);

  return { connected };
}
