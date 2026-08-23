'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ExternalLink, Loader2, Navigation } from 'lucide-react';
import {
  decodeGooglePolyline,
  isValidCoordinates,
  type LocationUpdatePayload,
} from '@xidmetal/shared';
import {
  googleMapsDirectionsUrl,
  googleMapsPlaceUrl,
  hasGoogleMapsApiKey,
  loadGoogleMapsApi,
  marketplaceMapOptions,
} from '@/lib/google-maps';
import { formatDistanceMeters, formatEta, cn } from '@/lib/utils';

const DEFAULT_ZOOM = 15;

function destPinSvg(gradientId: string): string {
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

function providerPinSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
  <circle cx="16" cy="16" r="15" fill="#1A1A1A"/>
  <circle cx="16" cy="16" r="11" fill="#FFCC00"/>
  <path d="M16 8l4.5 9h-9L16 8z" fill="#1A1A1A"/>
</svg>`;
}

export interface LiveTrackingMapProps {
  destLat?: number | null;
  destLng?: number | null;
  address?: string | null;
  location: LocationUpdatePayload | null;
  connected: boolean;
  className?: string;
  showDirections?: boolean;
}

export function LiveTrackingMap({
  destLat,
  destLng,
  address,
  location,
  connected,
  className,
  showDirections = false,
}: LiveTrackingMapProps) {
  const pinGradientId = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const destMarkerRef = useRef<google.maps.Marker | null>(null);
  const providerMarkerRef = useRef<google.maps.Marker | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasApiKey = hasGoogleMapsApiKey();
  const dest = useMemo(() => {
    if (destLat == null || destLng == null) return null;
    const lat = Number(destLat);
    const lng = Number(destLng);
    return isValidCoordinates(lat, lng) ? { lat, lng } : null;
  }, [destLat, destLng]);

  const provider = useMemo(() => {
    if (!location || !isValidCoordinates(location.lat, location.lng)) return null;
    return { lat: location.lat, lng: location.lng, heading: location.heading };
  }, [location]);

  const routePath = useMemo(() => {
    const encoded = location?.routePolyline?.trim();
    if (!encoded) return null;
    const points = decodeGooglePolyline(encoded).filter((p) => isValidCoordinates(p.lat, p.lng));
    return points.length >= 2 ? points : null;
  }, [location?.routePolyline]);

  const etaLabel = formatEta(location?.etaSeconds);
  const distanceLabel = formatDistanceMeters(location?.distanceMeters);
  const placeUrl = dest ? googleMapsPlaceUrl(dest.lat, dest.lng) : null;
  const directionsUrl = dest ? googleMapsDirectionsUrl(dest.lat, dest.lng) : null;
  const title = address?.trim() || 'Xidmət ünvanı';

  useEffect(() => {
    if (!hasApiKey || !containerRef.current) return;
    const center = provider ?? dest;
    if (!center) return;
    if (mapRef.current) return;

    let cancelled = false;

    void (async () => {
      try {
        const maps = await loadGoogleMapsApi();
        if (cancelled || !containerRef.current) return;

        const map = new maps.Map(
          containerRef.current,
          marketplaceMapOptions(maps, {
            center,
            zoom: DEFAULT_ZOOM,
            mapTypeId: 'roadmap',
            disableDefaultUI: true,
            zoomControl: true,
            clickableIcons: false,
            keyboardShortcuts: false,
            gestureHandling: 'greedy',
            isFractionalZoomEnabled: true,
          }),
        );

        mapRef.current = map;

        if (dest) {
          destMarkerRef.current = new maps.Marker({
            map,
            position: dest,
            title,
            zIndex: 1,
            optimized: false,
            icon: {
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(destPinSvg(pinGradientId))}`,
              scaledSize: new maps.Size(36, 48),
              anchor: new maps.Point(18, 48),
            },
          });
        }

        providerMarkerRef.current = new maps.Marker({
          map,
          position: provider ?? dest,
          title: 'Xidmət verən',
          zIndex: 2,
          visible: Boolean(provider),
          optimized: false,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(providerPinSvg())}`,
            scaledSize: new maps.Size(32, 32),
            anchor: new maps.Point(16, 16),
          },
        });

        polylineRef.current = new maps.Polyline({
          map,
          path: [],
          strokeColor: '#1A1A1A',
          strokeOpacity: 0.85,
          strokeWeight: 4,
          zIndex: 0,
        });

        if (!cancelled) setReady(true);
      } catch (err) {
        console.error('[LiveTrackingMap] Google Maps yüklənmədi:', err);
        if (!cancelled) setError('Xəritə yüklənə bilmədi');
      }
    })();

    return () => {
      cancelled = true;
      destMarkerRef.current?.setMap(null);
      destMarkerRef.current = null;
      providerMarkerRef.current?.setMap(null);
      providerMarkerRef.current = null;
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
      mapRef.current = null;
    };
  }, [hasApiKey, dest, provider, title, pinGradientId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    if (dest && destMarkerRef.current) {
      destMarkerRef.current.setPosition(dest);
    }

    if (providerMarkerRef.current) {
      if (provider) {
        providerMarkerRef.current.setVisible(true);
        providerMarkerRef.current.setPosition(provider);
      } else {
        providerMarkerRef.current.setVisible(false);
      }
    }

    if (polylineRef.current) {
      polylineRef.current.setPath(routePath ?? []);
    }

    const bounds = new google.maps.LatLngBounds();
    let hasBound = false;
    if (dest) {
      bounds.extend(dest);
      hasBound = true;
    }
    if (provider) {
      bounds.extend(provider);
      hasBound = true;
    }
    if (hasBound) {
      if (dest && provider) {
        map.fitBounds(bounds, 64);
      } else {
        map.setCenter(provider ?? dest!);
      }
    }
  }, [ready, dest, provider, routePath]);

  const showCanvas = hasApiKey && !error && Boolean(dest || provider);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-foreground">Canlı izləmə</p>
        <p className="text-xs text-muted-foreground">
          {connected ? 'Canlı bağlantı' : 'Yeniləmə gözlənilir'}
        </p>
      </div>
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
            className="h-64 w-full sm:h-80"
            role="img"
            aria-label="Canlı izləmə xəritəsi"
          />
        ) : (
          <div
            className="flex h-64 flex-col items-center justify-center gap-2 bg-muted/40 px-4 text-center sm:h-80"
            role="status"
          >
            <p className="text-sm text-muted-foreground">
              {error ??
                (dest || provider
                  ? 'Xəritə önizləməsi üçün API açarı yoxdur'
                  : 'Ünvan koordinatı yoxdur — xidmət verən yola çıxanda izləmə açılacaq')}
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

        {showCanvas && !ready ? (
          <div className="absolute inset-0 z-[1] flex items-center justify-center bg-muted/50">
            <Loader2 className="h-6 w-6 animate-spin text-brand-foreground" aria-hidden />
            <span className="sr-only">Xəritə yüklənir</span>
          </div>
        ) : null}

        {(etaLabel || distanceLabel) && (
          <div className="pointer-events-none absolute left-3 top-3 z-[2] rounded-xl bg-card/95 px-3 py-2 text-sm shadow-sm backdrop-blur-sm ring-1 ring-border/70">
            {etaLabel ? (
              <p className="font-semibold tabular-nums text-foreground">Təxmini: {etaLabel}</p>
            ) : null}
            {distanceLabel ? (
              <p className="text-xs text-muted-foreground">{distanceLabel}</p>
            ) : null}
          </div>
        )}

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
