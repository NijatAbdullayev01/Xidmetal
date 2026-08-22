'use client';

import { isValidCoordinates } from '@xidmetal/shared';
import { LocationMapPreview } from '@/components/geo/location-map-preview';
import { cn } from '@/lib/utils';

export interface BookingAddressBlockProps {
  address?: string | null;
  destLat?: number | null;
  destLng?: number | null;
  /** Xidmət verən kartında yol tarifi */
  showDirections?: boolean;
  className?: string;
}

export function BookingAddressBlock({
  address,
  destLat,
  destLng,
  showDirections = false,
  className,
}: BookingAddressBlockProps) {
  const lat = destLat == null ? null : Number(destLat);
  const lng = destLng == null ? null : Number(destLng);
  const hasCoords =
    lat != null && lng != null && isValidCoordinates(lat, lng);
  const addressText = address?.trim() || null;

  if (!addressText && !hasCoords) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-start gap-2">
        <span className="shrink-0 text-foreground">Yazılı ünvan:</span>
        <span className="min-w-0 flex-1 break-words text-muted-foreground">
          {addressText ?? 'Xəritədə seçilmiş mövqe'}
        </span>
      </div>
      <LocationMapPreview
        lat={hasCoords ? lat : null}
        lng={hasCoords ? lng : null}
        address={addressText}
        showDirections={showDirections}
      />
    </div>
  );
}
