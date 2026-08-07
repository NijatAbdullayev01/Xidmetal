'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  REALTIME_EVENTS,
  LOCATION_PUSH_MIN_INTERVAL_MS,
  type BookingStatusPayload,
  type LocationPushPayload,
  type LocationUpdatePayload,
} from '@xidmetal/shared';
import { getSharedSocket, useSocket } from '@/hooks/use-socket';

/**
 * Sifariş otağına subscribe + location:update / booking:status.
 * WS gələndə bookings query invalidate (polling saxlanılır).
 */
export function useBookingTracking(
  bookingId: string | null | undefined,
  enabled = true,
): {
  connected: boolean;
  location: LocationUpdatePayload | null;
  lastStatus: BookingStatusPayload | null;
  pushLocation: (coords: Omit<LocationPushPayload, 'bookingId'>) => void;
  throttleMs: number;
} {
  const { connected } = useSocket(enabled && Boolean(bookingId));
  const queryClient = useQueryClient();
  const [location, setLocation] = useState<LocationUpdatePayload | null>(null);
  const [lastStatus, setLastStatus] = useState<BookingStatusPayload | null>(null);

  useEffect(() => {
    if (!connected || !bookingId) return;
    const socket = getSharedSocket();
    if (!socket) return;

    socket.emit(REALTIME_EVENTS.BOOKING_SUBSCRIBE, { bookingId });

    const onLocation = (payload: LocationUpdatePayload) => {
      if (payload.bookingId !== bookingId) return;
      setLocation(payload);
    };

    const onStatus = (payload: BookingStatusPayload) => {
      if (payload.bookingId !== bookingId) return;
      setLastStatus(payload);
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
    };

    socket.on(REALTIME_EVENTS.LOCATION_UPDATE, onLocation);
    socket.on(REALTIME_EVENTS.BOOKING_STATUS, onStatus);

    return () => {
      socket.emit(REALTIME_EVENTS.BOOKING_UNSUBSCRIBE, { bookingId });
      socket.off(REALTIME_EVENTS.LOCATION_UPDATE, onLocation);
      socket.off(REALTIME_EVENTS.BOOKING_STATUS, onStatus);
    };
  }, [connected, bookingId, queryClient]);

  const pushLocation = useCallback(
    (coords: Omit<LocationPushPayload, 'bookingId'>) => {
      if (!connected || !bookingId) return;
      const socket = getSharedSocket();
      if (!socket) return;
      const payload: LocationPushPayload = { bookingId, ...coords };
      socket.emit(REALTIME_EVENTS.LOCATION_PUSH, payload);
    },
    [connected, bookingId],
  );

  return {
    connected,
    location,
    lastStatus,
    pushLocation,
    throttleMs: LOCATION_PUSH_MIN_INTERVAL_MS,
  };
}

/**
 * Bir neçə EN_ROUTE sifariş üçün status invalidate (provider dashboard).
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
