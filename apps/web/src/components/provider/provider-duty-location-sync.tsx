'use client';

import { useProviderDutyLocation } from '@/hooks/use-provider-duty-location';

/**
 * Provider dashboard açıq olanda ONLINE/BUSY mövqesini saxlayır.
 * Kart yalnız UI; bu komponent layout-da sinxron işləyir.
 */
export function ProviderDutyLocationSync() {
  useProviderDutyLocation(true);
  return null;
}
