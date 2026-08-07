'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BookingStatus,
  LOCATION_PUSH_MIN_INTERVAL_MS,
  REALTIME_EVENTS,
  type BookingSummary,
} from '@xidmetal/shared';
import { getSharedSocket, useSocket } from '@/hooks/use-socket';
import { cn } from '@/lib/utils';

interface ProviderLocationPublisherProps {
  bookings: BookingSummary[];
  className?: string;
}

/**
 * Provider: EN_ROUTE sifariş(lər) üçün watchPosition + throttle → location:push.
 * Background GPS brauzer limitləri səbəbilə tab açıq olanda etibarlıdır.
 */
export function ProviderLocationPublisher({
  bookings,
  className,
}: ProviderLocationPublisherProps) {
  const enRoute = bookings.filter((b) => b.status === BookingStatus.EN_ROUTE);
  const { connected } = useSocket(enRoute.length > 0);

  const [geoError, setGeoError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const lastPushRef = useRef(0);
  const watchIdRef = useRef<number | null>(null);
  const bookingIdsRef = useRef<string[]>([]);
  bookingIdsRef.current = enRoute.map((b) => b.id);

  const enRouteKey = enRoute.map((b) => b.id).join(',');

  useEffect(() => {
    if (enRoute.length === 0) {
      setSharing(false);
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      setGeoError('Brauzeriniz mövqe paylaşımını dəstəkləmir');
      return;
    }

    setGeoError(null);
    setSharing(true);

    const interval = LOCATION_PUSH_MIN_INTERVAL_MS;

    const socket = getSharedSocket();
    if (socket?.connected) {
      for (const id of bookingIdsRef.current) {
        socket.emit(REALTIME_EVENTS.BOOKING_SUBSCRIBE, { bookingId: id });
      }
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastPushRef.current < interval) return;
        lastPushRef.current = now;

        const active = getSharedSocket();
        if (!active?.connected) return;

        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading:
            pos.coords.heading != null && Number.isFinite(pos.coords.heading)
              ? pos.coords.heading
              : null,
          speed:
            pos.coords.speed != null && Number.isFinite(pos.coords.speed)
              ? pos.coords.speed
              : null,
        };

        for (const id of bookingIdsRef.current) {
          active.emit(REALTIME_EVENTS.LOCATION_PUSH, { bookingId: id, ...coords });
        }
      },
      () => {
        setGeoError('Mövqe icazəsi verilmədi və ya tapılmadı');
        setSharing(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: interval,
        timeout: 20_000,
      },
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setSharing(false);
    };
  }, [enRouteKey, enRoute.length, connected]);

  if (enRoute.length === 0) return null;

  return (
    <div
      className={cn(
        'rounded-xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm',
        className,
      )}
      role="status"
    >
      <p className="font-medium text-foreground">
        Canlı mövqe paylaşılır
        {enRoute.length > 1 ? ` (${enRoute.length} sifariş)` : ''}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {connected
          ? sharing
            ? 'Yolda olan sifarişlər üçün GPS ~3 saniyədə bir göndərilir'
            : 'GPS gözlənilir…'
          : 'Real-time bağlantı gözlənilir — polling davam edir'}
      </p>
      {geoError && <p className="mt-1 text-xs text-destructive">{geoError}</p>}
    </div>
  );
}
