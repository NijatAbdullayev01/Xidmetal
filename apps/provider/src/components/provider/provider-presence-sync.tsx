'use client';

import { useProviderAutoAvailability } from '@/hooks/use-provider-auto-availability';
import { useProviderDutyLocation } from '@/hooks/use-provider-duty-location';

/**
 * Provider dashboard: avtomatik əlçatanlıq + növbədə olanda mövqe sinxronu.
 * Layout-da bir dəfə mount edilir.
 */
export function ProviderPresenceSync() {
  useProviderAutoAvailability(true);
  useProviderDutyLocation(true);
  return null;
}
