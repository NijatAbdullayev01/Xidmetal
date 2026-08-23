'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Loader2, Navigation } from 'lucide-react';
import { isValidCoordinates } from '@xidmetal/shared';
import { api } from '@/lib/api';
import {
  googleMapsDirectionsQueryUrl,
  googleMapsDirectionsUrl,
  googleMapsPlaceQueryUrl,
  googleMapsPlaceUrl,
  hasGoogleMapsApiKey,
  loadGoogleMapsApi,
  marketplaceMapOptions,
} from '@/lib/google-maps';
import { cn } from '@/lib/utils';

const PREVIEW_ZOOM = 16;

function brandPinSvg(gradientId: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48" fill="none">
  <defs>
    <linearGradient id="${gradientId}" x1="0" y1="0" x2="36" y2="48">
      <stop stop-color="#fff" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <path d="M18 0C8.059 0 0 8.059 0 18c0 12.75 18 30 18 30s18-17.25 18-30C36 8.059 27.941 0 18 0z" fill="#FFCC00"/>
  <path d="M18 0C8.059 0 0 8.059 0 18c0 12.75 18 30 18 30s18-17.25 18-30C36 8.059 27.941 0 18 0z" fill="url(#${gradientId})" fill-opacity="0.35"/>
  <circle cx="18" cy="18" r="7" fill="#1A1A1A"/>
  <circle cx="18" cy="18" r="3.25" fill="#FFCC00"/>
</svg>`;
}

function parseCoords(
  lat?: number | null,
  lng?: number | null,
): { lat: number; lng: number } | null {
  if (lat == null || lng == null) return null;
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  return isValidCoordinates(parsedLat, parsedLng)
    ? { lat: parsedLat, lng: parsedLng }
    : null;
}

export interface LocationMapPreviewProps {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  className?: string;
  /** Xidmət verən üçün yol tarifi düyməsi */
  showDirections?: boolean;
}

/**
 * Oxunuş xəritəsi — saxlanmış koordinat, yoxdursa ünvan geokodu.
 * Siyahıda yalnız viewport-a yaxın olanda yüklənir.
 */
export function LocationMapPreview({
  lat,
  lng,
  address,
  className,
  showDirections = false,
}: LocationMapPreviewProps) {
  const pinGradientId = useId().replace(/:/g, '');
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasApiKey = hasGoogleMapsApiKey();
  const addressText = address?.trim() || '';
  const givenCoords = useMemo(() => parseCoords(lat, lng), [lat, lng]);

  const geocodeQuery = useQuery({
    queryKey: ['geo', 'geocode', addressText],
    queryFn: async () => {
      const results = await api.geo.geocode(addressText);
      const hit = results.find((row) => isValidCoordinates(row.lat, row.lng));
      if (!hit) {
        throw new Error('Mövqe tapılmadı');
      }
      return { lat: hit.lat, lng: hit.lng };
    },
    enabled: inView && !givenCoords && addressText.length >= 2,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  const resolved = givenCoords ?? geocodeQuery.data ?? null;
  const title = addressText || 'Xəritədə seçilmiş mövqe';
  const placeUrl = resolved
    ? googleMapsPlaceUrl(resolved.lat, resolved.lng)
    : addressText
      ? googleMapsPlaceQueryUrl(addressText)
      : null;
  const directionsUrl = resolved
    ? googleMapsDirectionsUrl(resolved.lat, resolved.lng)
    : addressText
      ? googleMapsDirectionsQueryUrl(addressText)
      : null;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '160px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !hasApiKey || !resolved || !containerRef.current) return;
    if (mapRef.current) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    const { lat: centerLat, lng: centerLng } = resolved;

    void (async () => {
      try {
        const maps = await loadGoogleMapsApi();
        if (cancelled || !containerRef.current) return;

        const map = new maps.Map(
          containerRef.current,
          marketplaceMapOptions(maps, {
            center: { lat: centerLat, lng: centerLng },
            zoom: PREVIEW_ZOOM,
            mapTypeId: 'roadmap',
            disableDefaultUI: true,
            zoomControl: false,
            clickableIcons: false,
            keyboardShortcuts: false,
            gestureHandling: 'cooperative',
            isFractionalZoomEnabled: true,
          }),
        );

        const marker = new maps.Marker({
          map,
          position: { lat: centerLat, lng: centerLng },
          title,
          clickable: false,
          optimized: false,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(brandPinSvg(pinGradientId))}`,
            scaledSize: new maps.Size(36, 48),
            anchor: new maps.Point(18, 48),
          },
        });

        mapRef.current = map;
        markerRef.current = marker;

        const relayout = () => {
          maps.event.trigger(map, 'resize');
          map.setCenter({ lat: centerLat, lng: centerLng });
        };
        requestAnimationFrame(relayout);

        if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
          resizeObserver = new ResizeObserver(() => relayout());
          resizeObserver.observe(containerRef.current);
        }

        if (!cancelled) setReady(true);
      } catch (err) {
        console.error('[LocationMapPreview] Google Maps yüklənmədi:', err);
        if (!cancelled) {
          setError('Xəritə yüklənə bilmədi');
        }
      }
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [inView, hasApiKey, resolved, title, pinGradientId]);

  useEffect(() => {
    if (!ready || !resolved || !mapRef.current || !markerRef.current) return;
    const position = { lat: resolved.lat, lng: resolved.lng };
    markerRef.current.setPosition(position);
    markerRef.current.setTitle(title);
    mapRef.current.setCenter(position);
  }, [ready, resolved, title]);

  if (!givenCoords && !addressText) return null;

  const showCanvas = hasApiKey && !error && !geocodeQuery.isError;
  const locating =
    !resolved && !geocodeQuery.isError && (geocodeQuery.isFetching || !inView);

  return (
    <div ref={rootRef} className={cn('space-y-2', className)}>
      <p className="text-foreground">Mövqe</p>
      <div
        className={cn(
          'relative isolate overflow-hidden rounded-2xl',
          'ring-1 ring-border/80',
          'shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)]',
        )}
      >
        {showCanvas ? (
          <div
            ref={containerRef}
            className="h-44 w-full sm:h-52"
            role="img"
            aria-label={`${title} — mövqe xəritəsi`}
          />
        ) : (
          <div
            className="flex h-44 flex-col items-center justify-center gap-2 bg-muted/40 px-4 text-center sm:h-52"
            role="status"
          >
            <p className="text-sm text-muted-foreground">
              {error ??
                (geocodeQuery.isError
                  ? 'Mövqe xəritədə tapılmadı'
                  : 'Xəritə önizləməsi üçün API açarı yoxdur')}
            </p>
            {placeUrl ? (
              <a
                href={placeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                Google Maps-də aç
              </a>
            ) : null}
          </div>
        )}

        {showCanvas && (locating || !ready) ? (
          <div className="absolute inset-0 z-[1] flex items-center justify-center bg-muted/50">
            <Loader2 className="h-6 w-6 animate-spin text-brand-foreground" aria-hidden />
            <span className="sr-only">Xəritə yüklənir</span>
          </div>
        ) : null}

        {placeUrl ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-background/90 via-background/40 to-transparent px-3 pb-3 pt-10">
            <div className="pointer-events-auto flex flex-wrap items-center gap-2">
              <a
                href={placeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border/70',
                  'bg-card/95 px-3 text-sm font-medium text-foreground shadow-sm backdrop-blur-sm',
                  'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                )}
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Xəritədə aç
              </a>
              {showDirections && directionsUrl ? (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-brand/40',
                    'bg-brand px-3 text-sm font-medium text-brand-foreground shadow-sm',
                    'hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                  )}
                >
                  <Navigation className="h-3.5 w-3.5" aria-hidden />
                  Yol tarifi
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
