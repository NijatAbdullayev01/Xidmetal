'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MapPin, Radio } from 'lucide-react';
import {
  ProviderAvailability,
  type UserProfile,
} from '@xidmetal/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, type SelectOption } from '@/components/ui/select';
import { useAuthToken } from '@/hooks/use-auth-token';
import { api, ApiError } from '@/lib/api';
import {
  GeoPositionError,
  readCurrentPosition,
} from '@/lib/geolocation';
import { useAuthStore } from '@/store/auth.store';
import { useProviderDutyLocationStore } from '@/store/provider-duty-location.store';
import { cn } from '@/lib/utils';

const AVAILABILITY_OPTIONS: SelectOption[] = [
  { value: ProviderAvailability.ONLINE, label: 'Onlayn' },
  { value: ProviderAvailability.OFFLINE, label: 'Oflayn' },
  { value: ProviderAvailability.BUSY, label: 'Məşğul', disabled: true },
];

function availabilityLabel(value: ProviderAvailability | string | undefined): string {
  switch (value) {
    case ProviderAvailability.ONLINE:
      return 'Onlayn';
    case ProviderAvailability.BUSY:
      return 'Məşğul';
    default:
      return 'Oflayn';
  }
}

function availabilityBadgeVariant(
  value: ProviderAvailability,
): 'success' | 'warning' | 'muted' {
  switch (value) {
    case ProviderAvailability.ONLINE:
      return 'success';
    case ProviderAvailability.BUSY:
      return 'warning';
    default:
      return 'muted';
  }
}

function applyDutyPatch(
  profile: UserProfile | undefined,
  patch: {
    availability: ProviderAvailability;
    lastLat?: number | null;
    lastLng?: number | null;
    lastHeading?: number | null;
    locationUpdatedAt?: string | null;
  },
): UserProfile | undefined {
  if (!profile?.providerProfile) return profile;
  return {
    ...profile,
    providerProfile: {
      ...profile.providerProfile,
      availability: patch.availability,
      ...(patch.lastLat !== undefined ? { lastLat: patch.lastLat } : {}),
      ...(patch.lastLng !== undefined ? { lastLng: patch.lastLng } : {}),
      ...(patch.lastHeading !== undefined ? { lastHeading: patch.lastHeading } : {}),
      ...(patch.locationUpdatedAt !== undefined
        ? { locationUpdatedAt: patch.locationUpdatedAt }
        : {}),
    },
  };
}

/**
 * Xidmət verən domain əlçatanlıq + mövqe.
 * User.lastSeenAt heartbeat-indən ayrıdır.
 */
export function ProviderAvailabilityCard() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => api.users.me(token!),
    enabled: !!token,
  });

  const dutySharing = useProviderDutyLocationStore((s) => s.sharing);
  const dutyGeoError = useProviderDutyLocationStore((s) => s.geoError);

  const profile = me?.providerProfile;
  const isVerified = profile?.isVerified === true;
  const availability =
    (profile?.availability as ProviderAvailability | undefined) ?? ProviderAvailability.OFFLINE;
  const hasLocation = profile?.lastLat != null && profile?.lastLng != null;
  const onDuty =
    availability === ProviderAvailability.ONLINE || availability === ProviderAvailability.BUSY;

  function syncLocalProfile(patch: {
    availability: ProviderAvailability;
    lastLat?: number | null;
    lastLng?: number | null;
    lastHeading?: number | null;
    locationUpdatedAt?: string | null;
  }) {
    queryClient.setQueryData<UserProfile>(['users', 'me'], (prev) =>
      applyDutyPatch(prev, patch),
    );
    const current = useAuthStore.getState().user;
    if (current?.providerProfile) {
      updateUser({
        providerProfile: {
          ...current.providerProfile,
          availability: patch.availability,
          ...(patch.lastLat !== undefined ? { lastLat: patch.lastLat } : {}),
          ...(patch.lastLng !== undefined ? { lastLng: patch.lastLng } : {}),
          ...(patch.lastHeading !== undefined ? { lastHeading: patch.lastHeading } : {}),
          ...(patch.locationUpdatedAt !== undefined
            ? { locationUpdatedAt: patch.locationUpdatedAt }
            : {}),
        },
      });
    }
  }

  const goOnlineMutation = useMutation({
    mutationFn: async () => {
      const coords = await readCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 10_000,
      });
      return api.geo.updateLocation(token!, {
        lat: coords.lat,
        lng: coords.lng,
        ...(coords.heading != null ? { heading: coords.heading } : {}),
        availability: ProviderAvailability.ONLINE,
      });
    },
    onSuccess: (result) => {
      setActionError(null);
      setActionSuccess('Növbəyə başladınız — mövqe paylaşılır');
      syncLocalProfile(result);
      void queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
    onError: (err: unknown) => {
      setActionSuccess(null);
      if (err instanceof GeoPositionError) {
        setActionError(err.message);
        return;
      }
      setActionError(err instanceof ApiError ? err.message : 'Növbəyə başlamaq mümkün olmadı');
    },
  });

  const goOfflineMutation = useMutation({
    mutationFn: () => api.geo.updateAvailability(token!, ProviderAvailability.OFFLINE),
    onSuccess: (result) => {
      setActionError(null);
      setActionSuccess('Növbədən çıxdınız');
      syncLocalProfile({
        availability: result.availability,
        lastLat: result.lastLat,
        lastLng: result.lastLng,
        lastHeading: result.lastHeading,
        locationUpdatedAt: result.locationUpdatedAt,
      });
      void queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
    onError: (err: unknown) => {
      setActionSuccess(null);
      setActionError(err instanceof ApiError ? err.message : 'Status yenilənmədi');
    },
  });

  const refreshLocationMutation = useMutation({
    mutationFn: async () => {
      const coords = await readCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 5_000,
      });
      const nextAvailability = isVerified
        ? availability === ProviderAvailability.OFFLINE
          ? ProviderAvailability.ONLINE
          : availability
        : ProviderAvailability.OFFLINE;
      return api.geo.updateLocation(token!, {
        lat: coords.lat,
        lng: coords.lng,
        ...(coords.heading != null ? { heading: coords.heading } : {}),
        availability: nextAvailability,
      });
    },
    onSuccess: (result) => {
      setActionError(null);
      setActionSuccess('Mövqe yeniləndi');
      syncLocalProfile(result);
      void queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
    onError: (err: unknown) => {
      setActionSuccess(null);
      if (err instanceof GeoPositionError) {
        setActionError(err.message);
        return;
      }
      setActionError(err instanceof ApiError ? err.message : 'Mövqe göndərilmədi');
    },
  });

  const busy =
    goOnlineMutation.isPending ||
    goOfflineMutation.isPending ||
    refreshLocationMutation.isPending ||
    locating;

  async function handleGoOnline() {
    setActionError(null);
    setActionSuccess(null);
    if (!isVerified) {
      setActionError('Onlayn olmaq üçün hesabınız admin tərəfindən təsdiqlənməlidir');
      return;
    }
    setLocating(true);
    try {
      await goOnlineMutation.mutateAsync();
    } finally {
      setLocating(false);
    }
  }

  function handleGoOffline() {
    setActionError(null);
    setActionSuccess(null);
    goOfflineMutation.mutate();
  }

  async function handleRefreshLocation() {
    setActionError(null);
    setActionSuccess(null);
    setLocating(true);
    try {
      await refreshLocationMutation.mutateAsync();
    } finally {
      setLocating(false);
    }
  }

  function handleAvailabilityChange(next: string) {
    if (
      next !== ProviderAvailability.ONLINE &&
      next !== ProviderAvailability.OFFLINE &&
      next !== ProviderAvailability.BUSY
    ) {
      return;
    }
    if (next === ProviderAvailability.BUSY) {
      setActionError('«Məşğul» statusu sifariş qəbul ediləndə avtomatik təyin olunur');
      return;
    }
    if (!isVerified && next === ProviderAvailability.ONLINE) {
      setActionError('Onlayn olmaq üçün hesabınız admin tərəfindən təsdiqlənməlidir');
      return;
    }
    setActionError(null);
    setActionSuccess(null);

    if (next === ProviderAvailability.ONLINE) {
      void handleGoOnline();
      return;
    }
    goOfflineMutation.mutate();
  }

  const displayError = actionError ?? (onDuty ? dutyGeoError : null);
  const locationUpdatedAt = profile?.locationUpdatedAt ?? null;

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Radio
              className={cn(
                'h-5 w-5',
                onDuty ? 'text-emerald-600' : 'text-brand-foreground',
              )}
              aria-hidden
            />
            Əlçatanlıq və mövqe
          </CardTitle>
          <Badge variant={availabilityBadgeVariant(availability)}>
            {availabilityLabel(availability)}
          </Badge>
        </div>
        <CardDescription>
          Onlayn olduqda dərhal gələn sifarişləri qəbul edə bilərsiniz. Mövqeniz
          avtomatik yenilənir ki, yaxınlıqdakı müştərilər sizi tapa bilsin. Bu
          status mesajlardakı «son görülmə»dən fərqlidir.
          {!isVerified
            ? ' Admin təsdiqinə qədər onlayn ola bilməzsiniz.'
            : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={cn(
            'rounded-lg border px-4 py-3',
            onDuty
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-border bg-muted/40',
          )}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-foreground">
                {availability === ProviderAvailability.BUSY
                  ? 'Sifariş üzərindəsiniz'
                  : onDuty
                    ? 'Növbədəsiniz'
                    : 'Növbədə deyilsiniz'}
              </p>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {meLoading
                  ? 'Status yüklənir…'
                  : availability === ProviderAvailability.BUSY
                    ? 'Mövqe yenilənməyə davam edir; yeni ani sifariş gəlməyəcək'
                    : onDuty
                      ? dutySharing
                        ? 'GPS aktiv — mövqe ~15 saniyədə bir göndərilir'
                        : 'GPS gözlənilir…'
                      : 'Ani sifarişlər üçün növbəyə başlayın və mövqeyi paylaşın'}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              {availability === ProviderAvailability.BUSY ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full sm:w-auto"
                  disabled
                >
                  Məşğul
                </Button>
              ) : onDuty ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full sm:w-auto"
                  onClick={handleGoOffline}
                  disabled={!token || busy}
                >
                  {goOfflineMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : null}
                  Növbədən çıx
                </Button>
              ) : (
                <Button
                  type="button"
                  className="min-h-11 w-full sm:w-auto"
                  onClick={() => void handleGoOnline()}
                  disabled={!token || !isVerified || busy}
                >
                  {goOnlineMutation.isPending || locating ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Radio className="h-4 w-4" aria-hidden />
                  )}
                  Növbəyə başla
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="provider-availability" className="text-sm font-medium">
            Status
          </label>
          <Select
            id="provider-availability"
            value={availability}
            onChange={handleAvailabilityChange}
            options={AVAILABILITY_OPTIONS}
            disabled={!token || busy || !isVerified || availability === ProviderAvailability.BUSY}
            ariaLabel="Əlçatanlıq statusu"
          />
          <p className="text-sm text-muted-foreground">
            Cari: {availabilityLabel(availability)}
            {locationUpdatedAt
              ? ` · son mövqe: ${new Date(locationUpdatedAt).toLocaleString('az-AZ')}`
              : ''}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            onClick={() => void handleRefreshLocation()}
            disabled={!token || busy}
          >
            {refreshLocationMutation.isPending || locating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <MapPin className="mr-2 h-4 w-4" aria-hidden />
            )}
            Mövqeyi yenilə
          </Button>
          {hasLocation ? (
            <p className="text-xs text-muted-foreground sm:text-sm">
              {Number(profile?.lastLat).toFixed(5)}, {Number(profile?.lastLng).toFixed(5)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground sm:text-sm">
              Mövqe hələ göndərilməyib
            </p>
          )}
        </div>

        {onDuty && !hasLocation ? (
          <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
            Onlaynsınız, amma mövqe yoxdur — yaxınlıq axtarışında görünməyəcəksiniz.
            «Mövqeyi yenilə» düyməsinə basın.
          </p>
        ) : null}

        {displayError ? (
          <p className="text-sm text-destructive" role="alert">
            {displayError}
          </p>
        ) : null}
        {actionSuccess ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
            {actionSuccess}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
