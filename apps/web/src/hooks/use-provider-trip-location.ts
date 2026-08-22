'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LOCATION_PUSH_MIN_INTERVAL_MS,
  REALTIME_EVENTS,
  TRACKABLE_BOOKING_STATUSES,
  type LocationPushPayload,
} from '@xidmetal/shared';
import { api } from '@/lib/api';
import { geoErrorMessage, type GeoCoords } from '@/lib/geolocation';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getSharedSocket, useSocket } from '@/hooks/use-socket';

const STATUSES = TRACKABLE_BOOKING_STATUSES.join(',');

/**
 * Aktiv izlənilən sifarişlər üçün `location:push` göndərir.
 * Növbə GPS-indən ayrıdır — sifariş otağına canlı mövqe.
 * Provider layout-da bir dəfə mount edilməlidir.
 */
export function useProviderTripLocation(enabled = true) {
  const token = useAuthToken();
  const { connected } = useSocket(enabled && !!token);
  const lastPushRef = useRef(0);
  const watchIdRef = useRef<number | null>(null);
  const bookingIdsRef = useRef<string[]>([]);

  const { data } = useQuery({
    queryKey: ['bookings', 'trackable'],
    queryFn: () =>
      api.bookings(token!, {
        limit: '20',
        statuses: STATUSES,
      }),
    enabled: enabled && !!token,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });

  const bookingIds = (data?.items ?? []).map((row) => row.id);
  bookingIdsRef.current = bookingIds;

  useEffect(() => {
    if (!enabled || !token || !connected || bookingIds.length === 0) {
      if (watchIdRef.current != null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    const push = (coords: GeoCoords) => {
      const now = Date.now();
      if (now - lastPushRef.current < LOCATION_PUSH_MIN_INTERVAL_MS) return;
      lastPushRef.current = now;
      const socket = getSharedSocket();
      if (!socket?.connected) return;

      for (const bookingId of bookingIdsRef.current) {
        const payload: LocationPushPayload = {
          bookingId,
          lat: coords.lat,
          lng: coords.lng,
          heading: coords.heading,
        };
        socket.emit(REALTIME_EVENTS.LOCATION_PUSH, payload);
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        push({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading:
            pos.coords.heading != null && Number.isFinite(pos.coords.heading)
              ? pos.coords.heading
              : null,
        });
      },
      () => {
        // İcazə yoxdursa növbə GPS kartı izah edir — burada səssiz keç
        void geoErrorMessage('permission_denied');
      },
      {
        enableHighAccuracy: true,
        maximumAge: LOCATION_PUSH_MIN_INTERVAL_MS,
        timeout: 20_000,
      },
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, token, connected, bookingIds.length]);
}
