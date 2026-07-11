'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';

export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persist = useAuthStore.persist;

    if (!persist) {
      setHydrated(true);
      return;
    }

    setHydrated(persist.hasHydrated());

    const unsub = persist.onFinishHydration(() => {
      setHydrated(true);
    });

    return unsub;
  }, []);

  return hydrated;
}
