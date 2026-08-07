'use client';

import { BookingStatus, isTrackableBookingStatus, type BookingSummary } from '@xidmetal/shared';
import { LiveTrackingMap } from '@/components/tracking/live-tracking-map';
import { useBookingTracking } from '@/hooks/use-booking-tracking';
import { cn } from '@/lib/utils';

function formatEta(etaSeconds: number | null | undefined): string | null {
  if (etaSeconds == null || !Number.isFinite(etaSeconds)) return null;
  if (etaSeconds < 60) return `${etaSeconds} san`;
  const mins = Math.round(etaSeconds / 60);
  if (mins < 60) return `~${mins} dəq`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `~${h} saat ${m} dəq` : `~${h} saat`;
}

function formatDistance(meters: number | null | undefined): string | null {
  if (meters == null || !Number.isFinite(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

interface BookingLiveTrackingProps {
  booking: BookingSummary;
  className?: string;
}

/**
 * Müştəri: EN_ROUTE / ARRIVED (və trackable) sifarişlər üçün canlı xəritə + ETA.
 */
export function BookingLiveTracking({ booking, className }: BookingLiveTrackingProps) {
  const trackable = isTrackableBookingStatus(booking.status);
  const showMap =
    trackable &&
    (booking.status === BookingStatus.EN_ROUTE || booking.status === BookingStatus.ARRIVED);

  const { connected, location } = useBookingTracking(
    showMap ? booking.id : null,
    showMap,
  );

  if (!showMap) return null;

  const etaLabel = formatEta(location?.etaSeconds);
  const distLabel = formatDistance(location?.distanceMeters);

  return (
    <div className={cn('mt-4 space-y-2', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Canlı izləmə</p>
        <span
          className={cn(
            'text-xs',
            connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
          )}
        >
          {connected ? 'Canlı' : 'Bağlantı gözlənilir…'}
        </span>
      </div>
      {(etaLabel || distLabel) && (
        <p className="text-sm text-muted-foreground">
          {etaLabel && (
            <>
              ETA: <span className="font-medium text-foreground">{etaLabel}</span>
            </>
          )}
          {etaLabel && distLabel ? ' · ' : null}
          {distLabel && (
            <>
              Məsafə: <span className="font-medium text-foreground">{distLabel}</span>
            </>
          )}
        </p>
      )}
      {!location && (
        <p className="text-xs text-muted-foreground">
          Xidmət verənin mövqeyi hələ göndərilməyib
        </p>
      )}
      <LiveTrackingMap
        destLat={booking.destLat}
        destLng={booking.destLng}
        location={location}
        initialLat={booking.originLat}
        initialLng={booking.originLng}
        className="h-52 sm:h-64"
      />
    </div>
  );
}
