'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  REALTIME_EVENTS,
  isTrackableBookingStatus,
  type BookingStatus,
  type LocationUpdatePayload,
} from '@xidmetal/shared';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getSharedSocket, useSocket } from '@/hooks/use-socket';

/**
 * Sifariş otağına qoşulub `location:update` dinləyir.
 * Son LocationPing seed kimi istifadə olunur (WS gələnə qədər).
 */
export function useLiveBookingTracking(options: {
  bookingId: string | null;
  status?: BookingStatus | string | null;
  enabled?: boolean;
}): {
  connected: boolean;
  location: LocationUpdatePayload | null;
} {
  const { bookingId, status, enabled = true } = options;
  const token = useAuthToken();
  const trackable = status ? isTrackableBookingStatus(status as BookingStatus) : true;
  const active = enabled && !!bookingId && !!token && trackable;
  const { connected } = useSocket(active);
  const [live, setLive] = useState<LocationUpdatePayload | null>(null);

  const pingsQuery = useQuery({
    queryKey: ['bookings', bookingId, 'location-pings'],
    queryFn: () => api.locationPings(token!, bookingId!, { limit: '1' }),
    enabled: active,
    staleTime: 10_000,
  });

  const seedPing = pingsQuery.data?.[0];
  const location: LocationUpdatePayload | null =
    live && live.bookingId === bookingId
      ? live
      : seedPing
        ? {
            bookingId: seedPing.bookingId,
            lat: seedPing.lat,
            lng: seedPing.lng,
            heading: seedPing.heading ?? null,
            speed: seedPing.speed ?? null,
            recordedAt: seedPing.recordedAt,
          }
        : null;

  useEffect(() => {
    setLive(null);
  }, [bookingId]);

  useEffect(() => {
    if (!active || !connected || !bookingId) return;
    const socket = getSharedSocket();
    if (!socket) return;

    const subscribe = () => {
      socket.emit(REALTIME_EVENTS.BOOKING_SUBSCRIBE, { bookingId });
    };

    subscribe();
    socket.on('connect', subscribe);

    const onUpdate = (payload: LocationUpdatePayload) => {
      if (payload?.bookingId !== bookingId) return;
      setLive(payload);
    };

    socket.on(REALTIME_EVENTS.LOCATION_UPDATE, onUpdate);

    return () => {
      socket.off('connect', subscribe);
      socket.off(REALTIME_EVENTS.LOCATION_UPDATE, onUpdate);
      socket.emit(REALTIME_EVENTS.BOOKING_UNSUBSCRIBE, { bookingId });
    };
  }, [active, connected, bookingId]);

  return { connected, location };
}
