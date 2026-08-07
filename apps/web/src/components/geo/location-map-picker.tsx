'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? '';

export interface LocationMapPickerValue {
  lat: number;
  lng: number;
  address?: string;
}

interface LocationMapPickerProps {
  lat?: number | null;
  lng?: number | null;
  disabled?: boolean;
  className?: string;
  onChange: (value: LocationMapPickerValue) => void;
}

/**
 * Mapbox pin seçici — token yoxdursa boş state; reverse geocode best-effort.
 */
export function LocationMapPicker({
  lat,
  lng,
  disabled,
  className,
  onChange,
}: LocationMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('mapbox-gl').Map | null>(null);
  const markerRef = useRef<import('mapbox-gl').Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reverseBusy, setReverseBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const applyCoords = useCallback(async (nextLat: number, nextLng: number) => {
    setReverseBusy(true);
    let address: string | undefined;
    try {
      const result = await api.geo.reverse(nextLat, nextLng);
      address = result?.displayName?.trim() || undefined;
    } catch {
      address = undefined;
    } finally {
      setReverseBusy(false);
    }
    onChangeRef.current({ lat: nextLat, lng: nextLng, address });
  }, []);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current || disabled) return;

    let cancelled = false;

    void (async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        if (cancelled || !containerRef.current) return;

        mapboxgl.accessToken = MAPBOX_TOKEN;
        const centerLng = lng ?? 49.8671;
        const centerLat = lat ?? 40.4093;

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [centerLng, centerLat],
          zoom: 13,
          attributionControl: true,
        });

        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
        mapRef.current = map;

        const el = document.createElement('div');
        el.className =
          'h-4 w-4 rounded-full border-2 border-brand-foreground bg-brand shadow-md';
        const marker = new mapboxgl.Marker({ element: el, draggable: true })
          .setLngLat([centerLng, centerLat])
          .addTo(map);
        markerRef.current = marker;

        marker.on('dragend', () => {
          const pos = marker.getLngLat();
          void applyCoords(pos.lat, pos.lng);
        });

        map.on('click', (e) => {
          marker.setLngLat(e.lngLat);
          void applyCoords(e.lngLat.lat, e.lngLat.lng);
        });

        map.on('load', () => {
          if (!cancelled) setReady(true);
        });
      } catch {
        if (!cancelled) setError('Xəritə yüklənə bilmədi');
      }
    })();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      mapRef.current?.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
    // Mount once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  useEffect(() => {
    if (!ready || !markerRef.current || !mapRef.current) return;
    if (lat == null || lng == null) return;
    markerRef.current.setLngLat([lng, lat]);
    mapRef.current.easeTo({ center: [lng, lat], duration: 400 });
  }, [ready, lat, lng]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError('Brauzeriniz mövqe paylaşımını dəstəkləmir');
      return;
    }
    setGeoBusy(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = pos.coords.latitude;
        const nextLng = pos.coords.longitude;
        if (markerRef.current && mapRef.current) {
          markerRef.current.setLngLat([nextLng, nextLat]);
          mapRef.current.easeTo({ center: [nextLng, nextLat], zoom: 15, duration: 600 });
        }
        void applyCoords(nextLat, nextLng).finally(() => setGeoBusy(false));
      },
      () => {
        setError('Mövqe icazəsi verilmədi və ya tapılmadı');
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  }

  if (!MAPBOX_TOKEN) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 px-4 text-center text-sm text-muted-foreground">
          <div>
            <MapPin className="mx-auto mb-2 h-5 w-5 opacity-60" aria-hidden />
            Xəritə üçün Mapbox token təyin olunmayıb
            <span className="mt-1 block text-xs">(NEXT_PUBLIC_MAPBOX_TOKEN)</span>
            <span className="mt-2 block text-xs">
              Aşağıdakı düymə və ya enlik/uzunluq sahələrindən istifadə edin
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 w-full sm:w-auto"
          disabled={disabled || geoBusy}
          onClick={useMyLocation}
        >
          {geoBusy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Mövqe…
            </>
          ) : (
            'Cari mövqeyimdən istifadə et'
          )}
        </Button>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div
        ref={containerRef}
        className="min-h-[220px] w-full overflow-hidden rounded-xl border border-border"
        role="application"
        aria-label="Ünvan seçimi xəritəsi"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          disabled={disabled || geoBusy}
          onClick={useMyLocation}
        >
          {geoBusy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Mövqe…
            </>
          ) : (
            'Cari mövqeyimdən istifadə et'
          )}
        </Button>
        {reverseBusy && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Ünvan axtarılır…
          </span>
        )}
      </div>
      {(error || (!ready && !error)) && (
        <p className="text-xs text-muted-foreground">
          {error ?? 'Xəritəyə toxunaraq və ya pin dartaraq ünvan seçin'}
        </p>
      )}
    </div>
  );
}
