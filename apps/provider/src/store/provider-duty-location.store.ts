'use client';

import { create } from 'zustand';

interface ProviderDutyLocationState {
  sharing: boolean;
  geoError: string | null;
  lastSyncedAt: string | null;
  setSharing: (sharing: boolean) => void;
  setGeoError: (error: string | null) => void;
  setLastSyncedAt: (at: string | null) => void;
  reset: () => void;
}

export const useProviderDutyLocationStore = create<ProviderDutyLocationState>((set) => ({
  sharing: false,
  geoError: null,
  lastSyncedAt: null,
  setSharing: (sharing) => set({ sharing }),
  setGeoError: (geoError) => set({ geoError }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  reset: () => set({ sharing: false, geoError: null, lastSyncedAt: null }),
}));
