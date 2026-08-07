'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MapPin, Radio } from 'lucide-react';
import { ProviderAvailability } from '@xidmetal/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, type SelectOption } from '@/components/ui/select';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';

const AVAILABILITY_OPTIONS: SelectOption[] = [
  { value: ProviderAvailability.ONLINE, label: 'Onlayn' },
  { value: ProviderAvailability.OFFLINE, label: 'Oflayn' },
  { value: ProviderAvailability.BUSY, label: 'Məşğul' },
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

/**
 * Provider domain əlçatanlıq + mövqe göndərmə.
 * User.lastSeenAt heartbeat-indən ayrıdır.
 */
export function ProviderAvailabilityCard() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoSuccess, setGeoSuccess] = useState<string | null>(null);

  const { data: me } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => api.users.me(token!),
    enabled: !!token,
  });

  const profile = me?.providerProfile;
  const availability =
    (profile?.availability as ProviderAvailability | undefined) ?? ProviderAvailability.OFFLINE;

  const availabilityMutation = useMutation({
    mutationFn: (next: ProviderAvailability) => api.geo.updateAvailability(token!, next),
    onSuccess: async () => {
      setGeoError(null);
      await queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
    onError: (err: unknown) => {
      setGeoError(err instanceof ApiError ? err.message : 'Status yenilənmədi');
    },
  });

  const locationMutation = useMutation({
    mutationFn: (coords: { lat: number; lng: number }) =>
      api.geo.updateLocation(token!, {
        lat: coords.lat,
        lng: coords.lng,
        availability:
          availability === ProviderAvailability.OFFLINE
            ? ProviderAvailability.ONLINE
            : availability,
      }),
    onSuccess: async () => {
      setGeoSuccess('Mövqe göndərildi');
      setGeoError(null);
      await queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
    onError: (err: unknown) => {
      setGeoError(err instanceof ApiError ? err.message : 'Mövqe göndərilmədi');
      setGeoSuccess(null);
    },
  });

  function sendCurrentLocation() {
    setGeoError(null);
    setGeoSuccess(null);
    if (!navigator.geolocation) {
      setGeoError('Brauzeriniz mövqe paylaşımını dəstəkləmir');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locationMutation.mutate({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        setGeoError('Mövqe icazəsi verilmədi və ya tapılmadı');
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Radio className="h-5 w-5 text-brand-foreground" aria-hidden />
          Əlçatanlıq və mövqe
        </CardTitle>
        <CardDescription>
          Onlayn = ani (on-demand) sifarişlərə hazırsınız. Mövqe göndərin ki, yaxınlıq
          axtarışında görünün. Bu, mesajlarda «son görülmə» (heartbeat) statusundan ayrıdır.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="provider-availability" className="text-sm font-medium">
            Status
          </label>
          <Select
            id="provider-availability"
            value={availability}
            onChange={(next) => {
              if (
                next === ProviderAvailability.ONLINE ||
                next === ProviderAvailability.OFFLINE ||
                next === ProviderAvailability.BUSY
              ) {
                availabilityMutation.mutate(next);
              }
            }}
            options={AVAILABILITY_OPTIONS}
            disabled={!token || availabilityMutation.isPending}
            ariaLabel="Əlçatanlıq statusu"
          />
          <p className="text-sm text-muted-foreground">
            Cari: {availabilityLabel(availability)}
            {profile?.locationUpdatedAt
              ? ` · son mövqe: ${new Date(profile.locationUpdatedAt).toLocaleString('az-AZ')}`
              : ''}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            onClick={sendCurrentLocation}
            disabled={!token || locationMutation.isPending}
          >
            {locationMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <MapPin className="mr-2 h-4 w-4" aria-hidden />
            )}
            Mövqeyi göndər
          </Button>
          {profile?.lastLat != null && profile?.lastLng != null ? (
            <p className="text-xs text-muted-foreground sm:text-sm">
              {profile.lastLat.toFixed(5)}, {profile.lastLng.toFixed(5)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground sm:text-sm">Mövqe hələ göndərilməyib</p>
          )}
        </div>

        {geoError ? (
          <p className="text-sm text-destructive" role="alert">
            {geoError}
          </p>
        ) : null}
        {geoSuccess ? (
          <p className="text-sm text-emerald-700" role="status">
            {geoSuccess}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
