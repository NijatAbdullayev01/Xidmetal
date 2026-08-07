'use client';

import { useEffect, useRef, useState } from 'react';
import type { LocationUpdatePayload } from '@xidmetal/shared';
import { cn } from '@/lib/utils';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? '';

interface LiveTrackingMapProps {
  /** Təyinat (müştəri ünvanı) */
  destLat?: number | null;
  destLng?: number | null;
  /** Provider canlı mövqe */
  location: LocationUpdatePayload | null;
  /** İlkin provider mövqeyi (son məlum) */
  initialLat?: number | null;
  initialLng?: number | null;
  className?: string;
}

/**
 * Mapbox GL JS canlı xəritə — token yoxdursa AZ empty state (build sınmır).
 */
export function LiveTrackingMap({
  destLat,
  destLng,
  location,
  initialLat,
  initialLng,
  className,
}: LiveTrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('mapbox-gl').Map | null>(null);
  const providerMarkerRef = useRef<import('mapbox-gl').Marker | null>(null);
  const destMarkerRef = useRef<import('mapbox-gl').Marker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const lat = location?.lat ?? initialLat ?? null;
  const lng = location?.lng ?? initialLng ?? null;

  useEffect(() => {
    if (!MAPBOX_TOKEN) return;
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    void (async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        if (cancelled || !containerRef.current) return;

        mapboxgl.accessToken = MAPBOX_TOKEN;

        const centerLng = lng ?? destLng ?? 49.8671;
        const centerLat = lat ?? destLat ?? 40.4093;

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [centerLng, centerLat],
          zoom: 13,
          attributionControl: true,
        });

        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
        mapRef.current = map;

        map.on('load', () => {
          if (cancelled) return;
          setReady(true);

          if (destLat != null && destLng != null) {
            const el = document.createElement('div');
            el.className = 'h-3 w-3 rounded-full border-2 border-white bg-blue-600 shadow';
            destMarkerRef.current = new mapboxgl.Marker({ element: el })
              .setLngLat([destLng, destLat])
              .addTo(map);
          }

          if (lat != null && lng != null) {
            const el = document.createElement('div');
            el.className =
              'h-4 w-4 rounded-full border-2 border-brand-foreground bg-brand shadow-md';
            providerMarkerRef.current = new mapboxgl.Marker({ element: el })
              .setLngLat([lng, lat])
              .addTo(map);
          }
        });
      } catch {
        if (!cancelled) setError('Xəritə yüklənə bilmədi');
      }
    })();

    return () => {
      cancelled = true;
      providerMarkerRef.current?.remove();
      destMarkerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
      providerMarkerRef.current = null;
      destMarkerRef.current = null;
    };
    // Map bir dəfə mount — mövqe ayrı effect-də yenilənir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || lat == null || lng == null) return;

    void (async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      const map = mapRef.current;
      if (!map) return;

      if (!providerMarkerRef.current) {
        const el = document.createElement('div');
        el.className =
          'h-4 w-4 rounded-full border-2 border-brand-foreground bg-brand shadow-md';
        providerMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);
      } else {
        providerMarkerRef.current.setLngLat([lng, lat]);
      }

      if (destLat != null && destLng != null) {
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([lng, lat]);
        bounds.extend([destLng, destLat]);
        map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 800 });
      } else {
        map.easeTo({ center: [lng, lat], duration: 600 });
      }
    })();
  }, [ready, lat, lng, destLat, destLng]);

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className={cn(
          'flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 px-4 text-center text-sm text-muted-foreground',
          className,
        )}
      >
        Canlı xəritə üçün Mapbox token təyin olunmayıb
        <span className="mt-1 block text-xs">(NEXT_PUBLIC_MAPBOX_TOKEN)</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          'flex min-h-[200px] items-center justify-center rounded-xl border border-border bg-muted/40 px-4 text-sm text-muted-foreground',
          className,
        )}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('min-h-[220px] w-full overflow-hidden rounded-xl border border-border', className)}
      role="img"
      aria-label="Canlı izləmə xəritəsi"
    />
  );
}
