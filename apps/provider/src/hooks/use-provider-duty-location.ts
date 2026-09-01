'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LOCATION_GEO_SYNC_INTERVAL_MS,
  ProviderAvailability,
  type UserProfile,
} from '@xidmetal/shared';
import { api, ApiError } from '@/lib/api';
import { buildWatchPositionOptions, geoErrorMessage, type GeoCoords } from '@/lib/geolocation';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useAuthStore } from '@/store/auth.store';
import { useProviderDutyLocationStore } from '@/store/provider-duty-location.store';

function isDutyAvailability(value: ProviderAvailability | string | undefined): boolean {
  return value === ProviderAvailability.ONLINE || value === ProviderAvailability.BUSY;
}

function patchProviderLocation(
  profile: UserProfile | undefined,
  patch: {
    lastLat: number;
    lastLng: number;
    lastHeading: number | null;
    locationUpdatedAt: string;
    availability?: ProviderAvailability;
  },
): UserProfile | undefined {
  if (!profile?.providerProfile) return profile;
  return {
    ...profile,
    providerProfile: {
      ...profile.providerProfile,
      lastLat: patch.lastLat,
      lastLng: patch.lastLng,
      lastHeading: patch.lastHeading,
      locationUpdatedAt: patch.locationUpdatedAt,
      ...(patch.availability != null ? { availability: patch.availability } : {}),
    },
  };
}

/**
 * Növbədə (ONLINE/BUSY) olanda ProviderProfile mövqesini periodik sinxronlaşdırır.
 * Yaxınlıq axtarışı / ani sifariş üçün lastLat/lng + PostGIS tələb olunur.
 * Yalnız bir yerdə (provider layout) mount edilməlidir.
 */
export function useProviderDutyLocation(enabled = true) {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);
  const setSharing = useProviderDutyLocationStore((s) => s.setSharing);
  const setGeoError = useProviderDutyLocationStore((s) => s.setGeoError);
  const setLastSyncedAt = useProviderDutyLocationStore((s) => s.setLastSyncedAt);
  const reset = useProviderDutyLocationStore((s) => s.reset);

  const lastPushRef = useRef(0);
  const watchIdRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);

  const { data: me } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => api.users.me(token!),
    enabled: enabled && !!token,
    staleTime: 15_000,
  });

  const profile = me?.providerProfile;
  const isVerified = profile?.isVerified === true;
  const availability =
    (profile?.availability as ProviderAvailability | undefined) ?? ProviderAvailability.OFFLINE;
  const onDuty = enabled && !!token && isVerified && isDutyAvailability(availability);

  useEffect(() => {
    if (!onDuty || !token) {
      reset();
      if (watchIdRef.current != null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError(geoErrorMessage('unsupported'));
      setSharing(false);
      return;
    }

    setGeoError(null);
    setSharing(true);

    const pushCoords = (coords: GeoCoords) => {
      const now = Date.now();
      if (now - lastPushRef.current < LOCATION_GEO_SYNC_INTERVAL_MS) return;
      if (inFlightRef.current) return;
      lastPushRef.current = now;
      inFlightRef.current = true;

      void api.geo
        .updateLocation(token, {
          lat: coords.lat,
          lng: coords.lng,
          ...(coords.heading != null ? { heading: coords.heading } : {}),
        })
        .then((result) => {
          setLastSyncedAt(result.locationUpdatedAt);
          setGeoError(null);

          queryClient.setQueryData<UserProfile>(['users', 'me'], (prev) =>
            patchProviderLocation(prev, {
              lastLat: result.lastLat,
              lastLng: result.lastLng,
              lastHeading: result.lastHeading,
              locationUpdatedAt: result.locationUpdatedAt,
              availability: result.availability,
            }),
          );

          const current = useAuthStore.getState().user;
          if (current?.providerProfile) {
            updateUser({
              providerProfile: {
                ...current.providerProfile,
                lastLat: result.lastLat,
                lastLng: result.lastLng,
                lastHeading: result.lastHeading,
                locationUpdatedAt: result.locationUpdatedAt,
                availability: result.availability,
              },
            });
          }
        })
        .catch((err: unknown) => {
          const message =
            err instanceof ApiError ? err.message : 'Mövqe sinxronlaşdırılmadı';
          setGeoError(message);
        })
        .finally(() => {
          inFlightRef.current = false;
        });
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        pushCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading:
            pos.coords.heading != null && Number.isFinite(pos.coords.heading)
              ? pos.coords.heading
              : null,
        });
      },
      (err) => {
        if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
          return;
        }
        const mapped =
          err.code === err.PERMISSION_DENIED
            ? geoErrorMessage('permission_denied')
            : geoErrorMessage('position_unavailable');
        setGeoError(mapped);
        setSharing(false);
      },
      buildWatchPositionOptions({
        enableHighAccuracy: true,
        maximumAge: LOCATION_GEO_SYNC_INTERVAL_MS,
        timeoutMs: 20_000,
      }),
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      reset();
    };
  }, [
    onDuty,
    token,
    queryClient,
    updateUser,
    setSharing,
    setGeoError,
    setLastSyncedAt,
    reset,
  ]);
}
