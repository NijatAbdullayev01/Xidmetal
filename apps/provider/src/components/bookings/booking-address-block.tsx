'use client';

import { formatBookingAddressDisplay } from '@/lib/booking-address';
import { cn } from '@/lib/utils';

export interface BookingAddressBlockProps {
  address?: string | null;
  destLat?: number | null;
  destLng?: number | null;
  className?: string;
}

export function BookingAddressBlock({
  address,
  destLat,
  destLng,
  className,
}: BookingAddressBlockProps) {
  const addressText = address?.trim()
    ? formatBookingAddressDisplay(address)
    : null;
  const hasCoords = destLat != null && destLng != null;

  if (!addressText && !hasCoords) return null;

  return (
    <div className={cn(className)}>
      <div className="flex items-start gap-2">
        <span className="shrink-0 text-foreground">Ünvan:</span>
        <span className="min-w-0 flex-1 break-words text-muted-foreground">
          {addressText ?? 'Ünvan qeyd olunmayıb'}
        </span>
      </div>
    </div>
  );
}
