'use client';

import { useSyncExternalStore } from 'react';
import { useAuthStore } from '@/store/auth.store';

/**
 * Zustand persist localStorage-dan client-də sinxron rehydrate edə bilir,
 * server isə həmişə boş initial state görür. Bu hook SSR snapshot-u (`false`)
 * hydration boyunca sabit saxlayır — auth-a bağlı UI mismatch verməsin.
 */
function subscribe(onStoreChange: () => void): () => void {
  const persist = useAuthStore.persist;
  if (!persist) {
    return () => {};
  }

  return persist.onFinishHydration(onStoreChange);
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
