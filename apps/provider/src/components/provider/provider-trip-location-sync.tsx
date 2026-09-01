'use client';

import { useProviderTripLocation } from '@/hooks/use-provider-trip-location';

/** Layout-da mount — aktiv sifariş üçün location:push */
export function ProviderTripLocationSync() {
  useProviderTripLocation(true);
  return null;
}
