'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CLIENT_APP,
  CLIENT_APP_HEADER,
  ProviderAvailability,
  UserRole,
  type UserProfile,
} from '@xidmetal/shared';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useAuthStore } from '@/store/auth.store';
import { PROVIDER_VERIFICATION_POLL_MS } from '@/lib/live-attention';

const ONLINE_REFRESH_MS = 20_000;

function patchAvailability(
  profile: UserProfile | undefined,
  availability: ProviderAvailability,
): UserProfile | undefined {
  if (!profile?.providerProfile) return profile;
  return {
    ...profile,
    providerProfile: {
      ...profile.providerProfile,
      availability,
    },
  };
}

/**
 * Xidmət verən dashboard-da:
 * - aktiv tab / saytda → ONLINE
 * - başqa taba keçid, tab bağlama, səhifədən çıxış → OFFLINE
 * BUSY (aktiv sifariş) heç vaxt avtomatik dəyişmir.
 * Yalnız provider layout-da mount edilməlidir.
 */
export function useProviderAutoAvailability(enabled = true) {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);
  const role = useAuthStore((s) => s.user?.role);

  const inFlightRef = useRef<ProviderAvailability | null>(null);
  const availabilityRef = useRef<ProviderAvailability>(ProviderAvailability.OFFLINE);

  const { data: me } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => api.users.me(token!),
    enabled: enabled && !!token && role === UserRole.PROVIDER,
    refetchInterval: (query) => {
      const profile = query.state.data?.providerProfile;
      if (profile && !profile.isVerified) return PROVIDER_VERIFICATION_POLL_MS;
      return false;
    },
  });

  useEffect(() => {
    if (!me?.providerProfile) return;
    updateUser({ providerProfile: me.providerProfile });
  }, [me, updateUser]);

  const profile = me?.providerProfile;
  const isVerified = profile?.isVerified === true;
  const availability =
    (profile?.availability as ProviderAvailability | undefined) ??
    ProviderAvailability.OFFLINE;

  availabilityRef.current = availability;

  useEffect(() => {
    if (!enabled || !token || role !== UserRole.PROVIDER || !isVerified) {
      return;
    }

    const syncLocal = (next: ProviderAvailability) => {
      availabilityRef.current = next;
      queryClient.setQueryData<UserProfile>(['users', 'me'], (prev) =>
        patchAvailability(prev, next),
      );
      const current = useAuthStore.getState().user;
      if (current?.providerProfile) {
        updateUser({
          providerProfile: {
            ...current.providerProfile,
            availability: next,
          },
        });
      }
    };

    const apply = async (next: ProviderAvailability.ONLINE | ProviderAvailability.OFFLINE) => {
      const current = availabilityRef.current;
      if (current === ProviderAvailability.BUSY) return;
      if (current === next) return;
      if (inFlightRef.current === next) return;

      inFlightRef.current = next;
      try {
        const result = await api.geo.updateAvailability(token, next);
        syncLocal(result.availability);
      } catch {
        /* şəbəkə/BUSY — növbəti visibility/interval yenidən cəhd edəcək */
      } finally {
        if (inFlightRef.current === next) {
          inFlightRef.current = null;
        }
      }
    };

    const syncFromVisibility = () => {
      if (document.visibilityState === 'visible') {
        void apply(ProviderAvailability.ONLINE);
      } else {
        void apply(ProviderAvailability.OFFLINE);
      }
    };

    /** Tab bağlananda / navigate away — cookie ilə keepalive */
    const goOfflineKeepalive = () => {
      if (availabilityRef.current === ProviderAvailability.BUSY) return;
      if (availabilityRef.current === ProviderAvailability.OFFLINE) return;

      const base =
        typeof window !== 'undefined' ? window.location.origin : '';
      void fetch(`${base}/api/v1/geo/me/availability`, {
        method: 'PATCH',
        credentials: 'include',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          [CLIENT_APP_HEADER]: CLIENT_APP.MARKETPLACE,
        },
        body: JSON.stringify({ availability: ProviderAvailability.OFFLINE }),
      }).catch(() => {
        /* unload — nəticə gözlənilmir */
      });
      syncLocal(ProviderAvailability.OFFLINE);
    };

    syncFromVisibility();

    document.addEventListener('visibilitychange', syncFromVisibility);
    window.addEventListener('pagehide', goOfflineKeepalive);

    const refreshId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void apply(ProviderAvailability.ONLINE);
      }
    }, ONLINE_REFRESH_MS);

    return () => {
      document.removeEventListener('visibilitychange', syncFromVisibility);
      window.removeEventListener('pagehide', goOfflineKeepalive);
      window.clearInterval(refreshId);
    };
  }, [enabled, token, role, isVerified, queryClient, updateUser]);
}
