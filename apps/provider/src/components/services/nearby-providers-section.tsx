'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MapPin, Navigation, ShieldCheck } from 'lucide-react';
import { providerPublicPath } from '@xidmetal/shared';
import { Button, buttonStyles } from '@/components/ui/button';
import { api } from '@/lib/api';
import { GeoPositionError, readCurrentPositionWithFallback } from '@/lib/geolocation';
import { cn } from '@/lib/utils';

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

type GeoState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'denied'; message: string }
  | { status: 'ready'; lat: number; lng: number };

/**
 * /services — yaxın onlayn provider-lər (GET /geo/nearby).
 */
export function NearbyProvidersSection({ className }: { className?: string }) {
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' });

  async function requestLocation() {
    setGeo({ status: 'locating' });
    try {
      const pos = await readCurrentPositionWithFallback({ desiredAccuracyM: 80 });
      setGeo({
        status: 'ready',
        lat: pos.lat,
        lng: pos.lng,
      });
    } catch (err) {
      setGeo({
        status: 'denied',
        message:
          err instanceof GeoPositionError
            ? err.message
            : 'Mövqe icazəsi verilmədi. Yaxın xidmətləri görmək üçün icazə verin.',
      });
    }
  }

  useEffect(() => {
    // Avtomatik sorğu etmirik — istifadəçi klikləsin (privacy)
  }, []);

  const nearbyQuery = useQuery({
    queryKey: ['geo', 'nearby', geo.status === 'ready' ? geo.lat : null, geo.status === 'ready' ? geo.lng : null],
    queryFn: () => {
      if (geo.status !== 'ready') throw new Error('Mövqe yoxdur');
      return api.geo.nearby({
        lat: geo.lat,
        lng: geo.lng,
        radiusKm: 10,
        limit: 12,
      });
    },
    enabled: geo.status === 'ready',
    staleTime: 30_000,
  });

  return (
    <section className={cn('border-b border-border/60 bg-background py-8 sm:py-10', className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              Yaxınımdakı xidmət verənlər
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Onlayn və 10 km radiusda olan icraçılar (təcili çağırış üçün).
            </p>
          </div>
          {geo.status !== 'ready' && (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 shrink-0"
              disabled={geo.status === 'locating'}
              onClick={requestLocation}
            >
              {geo.status === 'locating' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mövqe…
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4" />
                  Mövqeyimi göstər
                </>
              )}
            </Button>
          )}
        </div>

        {geo.status === 'idle' && (
          <div className="mt-6 flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
            <MapPin className="mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Yaxın xidmət verənləri görmək üçün mövqeyinizi paylaşın.
            </p>
          </div>
        )}

        {geo.status === 'denied' && (
          <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm text-destructive">
            {geo.message}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 min-h-11"
              onClick={requestLocation}
            >
              Yenidən cəhd et
            </Button>
          </div>
        )}

        {geo.status === 'ready' && nearbyQuery.isLoading && (
          <div className="mt-6 flex justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-brand" />
          </div>
        )}

        {geo.status === 'ready' && nearbyQuery.isError && (
          <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm text-destructive">
            Yaxın xidmət verənlər yüklənmədi. Bir az sonra yenidən cəhd edin.
          </div>
        )}

        {geo.status === 'ready' && nearbyQuery.data && nearbyQuery.data.items.length === 0 && (
          <div className="mt-6 rounded-2xl border border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
            10 km radiusda onlayn xidmət verən tapılmadı.
          </div>
        )}

        {geo.status === 'ready' && nearbyQuery.data && nearbyQuery.data.items.length > 0 && (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nearbyQuery.data.items.map((p) => (
              <li
                key={p.userId}
                className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {p.firstName} {p.lastName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistance(p.distanceM)} ·{' '}
                      {p.reviewCount > 0
                        ? `${p.rating.toFixed(1)} ★ (${p.reviewCount})`
                        : 'Reytinq yoxdur'}
                    </p>
                  </div>
                  {p.isVerified && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-medium text-brand-foreground"
                      title="Təsdiqlənmiş"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                      Təsdiqli
                    </span>
                  )}
                </div>
                <Link
                  href={providerPublicPath(p.userId)}
                  className={cn(buttonStyles('outline', 'sm'), 'mt-3 min-h-11 w-full')}
                >
                  Profilə bax
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
