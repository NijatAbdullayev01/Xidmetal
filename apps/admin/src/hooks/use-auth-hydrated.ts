'use client';

import { useSyncExternalStore } from 'react';
import { useAuthStore } from '@/store/auth.store';

function subscribe(onStoreChange: () => void): () => void {
  const persistApi = useAuthStore.persist;
  if (!persistApi) return () => {};
  return persistApi.onFinishHydration(onStoreChange);
}

function getClientSnapshot(): boolean {
  return useAuthStore.persist?.hasHydrated() ?? true;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useAuthHydrated(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
