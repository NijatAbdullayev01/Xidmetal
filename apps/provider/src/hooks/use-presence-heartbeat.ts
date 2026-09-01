'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Dashboard açıq olanda periodik heartbeat — digər tərəf onlayn / son görülmə görsün.
 */
export function usePresenceHeartbeat(enabled = true) {
  const token = useAuthToken();

  useEffect(() => {
    if (!enabled || !token) return;

    let cancelled = false;

    const beat = () => {
      if (cancelled || document.visibilityState === 'hidden') return;
      void api.users.heartbeat(token).catch(() => {
        /* şəbəkə xətası — növbəti intervalda yenidən cəhd */
      });
    };

    beat();
    const id = window.setInterval(beat, HEARTBEAT_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') beat();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, token]);
}
