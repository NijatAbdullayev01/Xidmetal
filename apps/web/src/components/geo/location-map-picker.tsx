'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Loader2, LocateFixed, Minus, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import {
  createSelectionPinMarker,
  hasGoogleMapsApiKey,
  isHumanReadableAddress,
  loadGoogleMapsApi,
  marketplaceMapOptions,
} from '@/lib/google-maps';
import {
  GeoPositionError,
  defaultHighAccuracyWaitMs,
  geoAccuracyHint,
  isWebKitGeolocationEngine,
  readCachedPosition,
  readCurrentPositionWithFallback,
  shouldAutoRequestGeolocation,
  shouldPrimeWithNetworkLocation,
} from '@/lib/geolocation';
import { cn } from '@/lib/utils';

/** Bakı — xəritə açılış mərkəzi (GPS yoxdursa) */
const DEFAULT_CENTER = { lat: 40.4093, lng: 49.8671 } as const;

/** Proqrammatik mərkəzləşdirmədən sonra idle commit-i nə qədər susdur (ms) */
const PROGRAMMATIC_IDLE_SUPPRESS_MS = isWebKitGeolocationEngine() ? 1_200 : 900;

/** Resize/viewport relayout debounce — Safari ünvan çubuğu çox event atır */
const RELAYOUT_DEBOUNCE_MS = 80;

/** Parent ↔ map sync üçün koordinat eyni sayılır */
const COORD_EPS = 1e-5;

/**
 * Modal açılış animasiyası bitmədən xəritə init olunarsa Google Maps
 * tile/proyeksiya hesablamasını səhv götürə bilir. Kiçik buffer saxlayırıq.
 */
const MAP_INIT_ANIMATION_BUFFER_MS = 260;

/** Ölçü və mövqe ardıcıl neçə frame sabit qalmalıdır */
const STABLE_LAYOUT_FRAMES = 2;

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
  /** Modal açılanda GPS ilə mərkəzləşdir (Bolt üslubu) */
  autoLocate?: boolean;
  onChange: (value: LocationMapPickerValue) => void;
}

function coordsNear(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
  eps = COORD_EPS,
): boolean {
  return Math.abs(aLat - bLat) < eps && Math.abs(aLng - bLng) < eps;
}

type LocatedReading = {
  lat: number;
  lng: number;
  accuracyM: number | null;
};

type ResolveLocationOptions = {
  allowQuickReading: boolean;
  highAccuracyWaitMs: number;
  signal?: AbortSignal;
};

function shouldAdoptReading(
  next: LocatedReading,
  current: LocatedReading | null,
): boolean {
  if (!current) return true;

  const nextAcc = next.accuracyM ?? Number.POSITIVE_INFINITY;
  const currentAcc = current.accuracyM ?? Number.POSITIVE_INFINITY;

  if (!coordsNear(next.lat, next.lng, current.lat, current.lng)) {
    return true;
  }

  return nextAcc + 15 < currentAcc;
}

function waitForAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function parseCssTimeMs(value: string): number {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((maxMs, entry) => {
      if (entry.endsWith('ms')) {
        const ms = Number(entry.slice(0, -2));
        return Number.isFinite(ms) ? Math.max(maxMs, ms) : maxMs;
      }
      if (entry.endsWith('s')) {
        const sec = Number(entry.slice(0, -1));
        return Number.isFinite(sec) ? Math.max(maxMs, sec * 1000) : maxMs;
      }
      return maxMs;
    }, 0);
}

async function waitForParentAnimation(container: HTMLDivElement): Promise<void> {
  const dialog = container.closest('[role="dialog"]');
  if (!(dialog instanceof HTMLElement)) return;

  const styles = window.getComputedStyle(dialog);
  const totalAnimationMs =
    parseCssTimeMs(styles.animationDuration) + parseCssTimeMs(styles.animationDelay);

  if (totalAnimationMs > 0) {
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        dialog.removeEventListener('animationend', finish);
        dialog.removeEventListener('animationcancel', finish);
        window.clearTimeout(timeoutId);
        resolve();
      };

      const timeoutId = window.setTimeout(
        finish,
        totalAnimationMs + MAP_INIT_ANIMATION_BUFFER_MS,
      );

      dialog.addEventListener('animationend', finish, { once: true });
      dialog.addEventListener('animationcancel', finish, { once: true });
    });
  }

  // Safari: animasiya bitəndən sonra belə transform containing block qala bilər —
  // Google Maps proyeksiyası CSS pin-dən sürüşür.
  dialog.style.transform = 'none';
}

async function waitForStableContainerLayout(container: HTMLDivElement): Promise<void> {
  const deadline = performance.now() + 1_200;
  let stableFrames = 0;
  let previousSnapshot: string | null = null;

  while (performance.now() < deadline) {
    await waitForAnimationFrame();
    const rect = container.getBoundingClientRect();

    if (rect.width < 16 || rect.height < 16) {
      stableFrames = 0;
      previousSnapshot = null;
      continue;
    }

    const snapshot = [
      Math.round(rect.left * 10) / 10,
      Math.round(rect.top * 10) / 10,
      Math.round(rect.width * 10) / 10,
      Math.round(rect.height * 10) / 10,
    ].join(':');

    if (snapshot === previousSnapshot) {
      stableFrames += 1;
    } else {
      stableFrames = 0;
      previousSnapshot = snapshot;
    }

    if (stableFrames >= STABLE_LAYOUT_FRAMES) {
      return;
    }
  }
}

/**
 * Mövqe seçici — Google Maps + Bolt üslubu:
 * mərkəzdə sabit pin, xəritə pan edilir; toxunuş mərkəzləşdirir.
 */
export function LocationMapPicker({
  lat,
  lng,
  disabled,
  className,
  autoLocate = false,
  onChange,
}: LocationMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const pinMarkerRef = useRef<google.maps.Marker | null>(null);
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const onChangeRef = useRef(onChange);
  const applyCoordsRef = useRef<(nextLat: number, nextLng: number) => Promise<void>>(
    async () => undefined,
  );
  const disabledRef = useRef(disabled);
  /** true ikən idle mərkəzi form-a yazılmır */
  const programmaticRef = useRef(false);
  /** Bu vaxta qədər idle commit yox (resize/zoom ikincili idle) */
  const suppressIdleUntilRef = useRef(0);
  /** Locate/sync hədəfi — idle mərkəzi bununla uyğunlaşdırılana qədər commit yox */
  const pendingCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  /** Locate nəsil — köhnə async nəticəni atmaq üçün */
  const locateGenRef = useRef(0);
  const locateAbortRef = useRef<AbortController | null>(null);
  const geoHintTimerRef = useRef<number | null>(null);
  /** Son hədəf mərkəz — Safari resize `getCenter()` drift-ini əvəz edir */
  const desiredCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  /** İstifadəçi pan/klik edəndən sonra idle GPS-i əvəz edə bilər */
  const userAdjustedRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinGradientId = useId().replace(/:/g, '');

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reverseBusy, setReverseBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoHint, setGeoHint] = useState<string | null>(null);
  const [pinLifted, setPinLifted] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);

  const hasSelection =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
  const hasApiKey = hasGoogleMapsApiKey();

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const updateAccuracyCircle = useCallback((nextLat: number, nextLng: number, radiusM: number | null) => {
    const map = mapRef.current;
    if (!map) return;

    if (radiusM == null || radiusM <= 0 || radiusM > 5_000) {
      accuracyCircleRef.current?.setMap(null);
      accuracyCircleRef.current = null;
      return;
    }

    if (!accuracyCircleRef.current) {
      accuracyCircleRef.current = new google.maps.Circle({
        map,
        center: { lat: nextLat, lng: nextLng },
        radius: radiusM,
        clickable: false,
        fillColor: '#FFCC00',
        fillOpacity: 0.18,
        strokeColor: '#E6B800',
        strokeOpacity: 0.55,
        strokeWeight: 1,
      });
      return;
    }

    accuracyCircleRef.current.setCenter({ lat: nextLat, lng: nextLng });
    accuracyCircleRef.current.setRadius(radiusM);
    accuracyCircleRef.current.setMap(map);
  }, []);

  const applyCoords = useCallback(async (nextLat: number, nextLng: number) => {
    setReverseBusy(true);
    let address: string | undefined;
    try {
      // Ünvan yalnız backend geocoder (Nominatim) — client Google Geocoding API
      // çağırılmır (ayrı aktivləşdirmə tələb edir və SDK console xətası verir).
      const result = await api.geo.reverse(nextLat, nextLng);
      const fromApi = result?.displayName?.trim();
      address = isHumanReadableAddress(fromApi) ? fromApi : undefined;
    } catch {
      address = undefined;
    } finally {
      setReverseBusy(false);
    }
    setResolvedAddress(address ?? null);
    onChangeRef.current({ lat: nextLat, lng: nextLng, address });
  }, []);

  useEffect(() => {
    applyCoordsRef.current = applyCoords;
  }, [applyCoords]);

  /**
   * Dəqiq mərkəzləşdirmə — panTo animasiyası yox, setCenter.
   * Idle commit susdurulur ki, köhnə mərkəz GPS-i əvəz etməsin.
   */
  const setViewProgrammatic = useCallback(
    (nextLat: number, nextLng: number, zoom?: number) => {
      const map = mapRef.current;
      if (!map) return;

      clearSettleTimer();
      programmaticRef.current = true;
      pendingCenterRef.current = { lat: nextLat, lng: nextLng };
      desiredCenterRef.current = { lat: nextLat, lng: nextLng };
      suppressIdleUntilRef.current = Date.now() + PROGRAMMATIC_IDLE_SUPPRESS_MS;
      setPinLifted(true);

      const targetZoom = zoom ?? Math.max(map.getZoom() ?? 16, 17);
      if (typeof map.getZoom() !== 'number' || map.getZoom() !== targetZoom) {
        map.setZoom(targetZoom);
      }
      map.setCenter({ lat: nextLat, lng: nextLng });
    },
    [clearSettleTimer],
  );

  const applyLocatedReading = useCallback(
    async (pos: LocatedReading, reverseGeocode = true) => {
      userAdjustedRef.current = false;
      setAccuracyM(pos.accuracyM);
      setViewProgrammatic(pos.lat, pos.lng, 18);
      updateAccuracyCircle(pos.lat, pos.lng, pos.accuracyM);
      if (reverseGeocode) {
        await applyCoords(pos.lat, pos.lng);
        return;
      }
      onChangeRef.current({ lat: pos.lat, lng: pos.lng });
    },
    [applyCoords, setViewProgrammatic, updateAccuracyCircle],
  );

  const clearGeoHint = useCallback(() => {
    if (geoHintTimerRef.current != null) {
      window.clearTimeout(geoHintTimerRef.current);
      geoHintTimerRef.current = null;
    }
    setGeoHint(null);
  }, []);

  const armGeoHint = useCallback(() => {
    clearGeoHint();
    geoHintTimerRef.current = window.setTimeout(() => {
      setGeoHint(
        'Brauzerin məkan sorğusuna icazə verin — ünvan çubuğundakı ikona basın',
      );
    }, 8_000);
  }, [clearGeoHint]);

  const beginLocateSignal = useCallback(() => {
    locateAbortRef.current?.abort();
    const controller = new AbortController();
    locateAbortRef.current = controller;
    return controller;
  }, []);

  const resolveUserLocation = useCallback(
    async (
      gen: number,
      cancelled: () => boolean = () => false,
      options: ResolveLocationOptions = {
        allowQuickReading: shouldPrimeWithNetworkLocation(),
        highAccuracyWaitMs: defaultHighAccuracyWaitMs(),
      },
    ) => {
      let adopted: LocatedReading | null = null;

      if (options.allowQuickReading && shouldPrimeWithNetworkLocation()) {
        try {
          const quick = await readCachedPosition({
            maximumAgeMs: 60_000,
            timeoutMs: 3_500,
          });
          if (cancelled() || gen !== locateGenRef.current) return;

          if (shouldAdoptReading(quick, adopted)) {
            adopted = quick;
            await applyLocatedReading(quick);
          }
        } catch {
          // Keş və ya şəbəkə mövqeyi olmaya bilər; dəqiq GPS mərhələsinə keçirik.
        }
      }

      try {
        const precise = await readCurrentPositionWithFallback({
          desiredAccuracyM: 35,
          highAccuracyWaitMs: options.highAccuracyWaitMs,
          signal: options.signal,
          onReading: (reading) => {
            if (cancelled() || gen !== locateGenRef.current) return;
            if (userAdjustedRef.current) return;
            if (!shouldAdoptReading(reading, adopted)) return;
            adopted = reading;
            void applyLocatedReading(reading, false);
          },
        });
        if (cancelled() || gen !== locateGenRef.current) return;
        if (userAdjustedRef.current) return;

        if (shouldAdoptReading(precise, adopted)) {
          adopted = precise;
          await applyLocatedReading(precise, true);
        } else {
          setAccuracyM(precise.accuracyM);
          updateAccuracyCircle(precise.lat, precise.lng, precise.accuracyM);
          await applyCoords(precise.lat, precise.lng);
        }

        if (!cancelled() && gen === locateGenRef.current) {
          requestAnimationFrame(() => {
            if (cancelled() || gen !== locateGenRef.current) return;
            setViewProgrammatic(precise.lat, precise.lng, 18);
            updateAccuracyCircle(precise.lat, precise.lng, precise.accuracyM);
          });
        }
        return;
      } catch (err) {
        if (cancelled() || gen !== locateGenRef.current) return;
        if (err instanceof GeoPositionError && err.code === 'aborted') return;
        if (adopted) return;
        throw err;
      }
    },
    [applyCoords, applyLocatedReading, setViewProgrammatic, updateAccuracyCircle],
  );

  const locateMe = useCallback(() => {
    if (disabled) return;
    const controller = beginLocateSignal();
    const gen = ++locateGenRef.current;
    userAdjustedRef.current = false;
    setGeoBusy(true);
    setError(null);
    armGeoHint();
    // Safari: watchPosition klikin eyni tick-ində başlamalıdır (await jesti yandırır)
    void resolveUserLocation(gen, () => controller.signal.aborted, {
      allowQuickReading: false,
      highAccuracyWaitMs: Math.max(25_000, defaultHighAccuracyWaitMs()),
      signal: controller.signal,
    })
      .catch((err: unknown) => {
        if (gen !== locateGenRef.current) return;
        if (err instanceof GeoPositionError && err.code === 'aborted') return;
        setError(err instanceof GeoPositionError ? err.message : 'Mövqe alınmadı');
      })
      .finally(() => {
        if (gen === locateGenRef.current) {
          clearGeoHint();
          setGeoBusy(false);
        }
      });
  }, [armGeoHint, beginLocateSignal, clearGeoHint, disabled, resolveUserLocation]);

  useEffect(() => {
    return () => {
      locateAbortRef.current?.abort();
      if (geoHintTimerRef.current != null) {
        window.clearTimeout(geoHintTimerRef.current);
      }
    };
  }, []);

  // Google Maps quraşdırılması
  useEffect(() => {
    if (!hasApiKey || !containerRef.current || mapRef.current) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let onViewportChange: (() => void) | null = null;
    let relayoutTimer: number | null = null;
    const initTimers: number[] = [];

    void (async () => {
      try {
        const maps = await loadGoogleMapsApi();
        if (cancelled || !containerRef.current) return;

        await waitForParentAnimation(containerRef.current);
        await waitForStableContainerLayout(containerRef.current);
        if (cancelled || !containerRef.current) return;

        const centerLat = lat ?? DEFAULT_CENTER.lat;
        const centerLng = lng ?? DEFAULT_CENTER.lng;

        const map = new maps.Map(
          containerRef.current,
          marketplaceMapOptions(
            maps,
            {
              center: { lat: centerLat, lng: centerLng },
              zoom: hasSelection ? 16 : 13,
              mapTypeId: 'roadmap',
              disableDefaultUI: true,
              clickableIcons: false,
              keyboardShortcuts: false,
              gestureHandling: 'greedy',
              scrollwheel: true,
              isFractionalZoomEnabled: false,
            },
            { forceRaster: true },
          ),
        );

        // İlk idle (yüklənmə) form-u Bakı ilə doldurmasın
        programmaticRef.current = true;
        suppressIdleUntilRef.current = Date.now() + PROGRAMMATIC_IDLE_SUPPRESS_MS;

        const onDragStart = () => {
          userAdjustedRef.current = true;
          programmaticRef.current = false;
          pendingCenterRef.current = null;
          setPinLifted(true);
          accuracyCircleRef.current?.setMap(null);
          accuracyCircleRef.current = null;
          setAccuracyM(null);
        };

        const onIdle = () => {
          const pending = pendingCenterRef.current;
          if (pending && !userAdjustedRef.current) {
            const center = map.getCenter();
            if (
              center &&
              coordsNear(center.lat(), center.lng(), pending.lat, pending.lng, 1e-4)
            ) {
              pendingCenterRef.current = null;
              desiredCenterRef.current = pending;
              programmaticRef.current = false;
              setPinLifted(false);
            } else if (center) {
              map.setCenter({ lat: pending.lat, lng: pending.lng });
              suppressIdleUntilRef.current =
                Date.now() + PROGRAMMATIC_IDLE_SUPPRESS_MS;
            }
            return;
          }

          setPinLifted(false);

          if (programmaticRef.current) {
            programmaticRef.current = false;
            return;
          }
          if (!userAdjustedRef.current) return;
          if (Date.now() < suppressIdleUntilRef.current) return;
          if (disabledRef.current) return;

          clearSettleTimer();
          settleTimerRef.current = setTimeout(() => {
            if (!userAdjustedRef.current) return;
            if (pendingCenterRef.current) return;
            if (Date.now() < suppressIdleUntilRef.current) return;
            const center = map.getCenter();
            if (!center) return;
            const settled = { lat: center.lat(), lng: center.lng() };
            desiredCenterRef.current = settled;
            setAccuracyM(null);
            accuracyCircleRef.current?.setMap(null);
            accuracyCircleRef.current = null;
            void applyCoordsRef.current(settled.lat, settled.lng);
          }, 180);
        };

        const onClick = (e: google.maps.MapMouseEvent) => {
          if (disabledRef.current || !e.latLng) return;
          userAdjustedRef.current = true;
          pendingCenterRef.current = null;
          accuracyCircleRef.current?.setMap(null);
          accuracyCircleRef.current = null;
          setAccuracyM(null);
          setPinLifted(true);
          map.panTo(e.latLng);
        };

        listenersRef.current = [
          map.addListener('dragstart', onDragStart),
          map.addListener('idle', onIdle),
          map.addListener('click', onClick),
        ];

        mapRef.current = map;

        const pinMarker = createSelectionPinMarker(maps, map, pinGradientId);
        pinMarkerRef.current = pinMarker;
        listenersRef.current.push(
          map.addListener('center_changed', () => {
            const center = map.getCenter();
            if (center) pinMarker.setPosition(center);
          }),
        );

        if (hasSelection && lat != null && lng != null) {
          desiredCenterRef.current = { lat, lng };
        }

        const applyRelayout = () => {
          if (cancelled) return;
          maps.event.trigger(map, 'resize');
          if (userAdjustedRef.current) return;
          const target = pendingCenterRef.current ?? desiredCenterRef.current;
          if (target) {
            map.setCenter({ lat: target.lat, lng: target.lng });
          }
        };
        const scheduleRelayout = () => {
          if (relayoutTimer != null) window.clearTimeout(relayoutTimer);
          relayoutTimer = window.setTimeout(() => {
            relayoutTimer = null;
            applyRelayout();
          }, RELAYOUT_DEBOUNCE_MS);
        };

        requestAnimationFrame(applyRelayout);
        initTimers.push(window.setTimeout(applyRelayout, 80));
        initTimers.push(window.setTimeout(applyRelayout, 320));
        initTimers.push(window.setTimeout(applyRelayout, 560));

        if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
          resizeObserver = new ResizeObserver(() => scheduleRelayout());
          resizeObserver.observe(containerRef.current);
        }

        onViewportChange = () => scheduleRelayout();
        window.visualViewport?.addEventListener('resize', onViewportChange);
        window.visualViewport?.addEventListener('scroll', onViewportChange);

        if (!cancelled) setReady(true);
      } catch (err) {
        console.error('[LocationMapPicker] Google Maps yüklənmədi:', err);
        if (!cancelled) {
          const detail =
            err instanceof Error && err.message.trim() ? ` (${err.message})` : '';
          setError(
            `Google xəritə yüklənə bilmədi. API açarını, Maps JavaScript API-ni və billing-i yoxlayın.${detail}`,
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      clearSettleTimer();
      for (const id of initTimers) window.clearTimeout(id);
      if (relayoutTimer != null) window.clearTimeout(relayoutTimer);
      resizeObserver?.disconnect();
      if (onViewportChange) {
        window.visualViewport?.removeEventListener('resize', onViewportChange);
        window.visualViewport?.removeEventListener('scroll', onViewportChange);
      }
      pinMarkerRef.current?.setMap(null);
      pinMarkerRef.current = null;
      for (const listener of listenersRef.current) {
        listener.remove();
      }
      listenersRef.current = [];
      accuracyCircleRef.current?.setMap(null);
      accuracyCircleRef.current = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasApiKey]);

  // Parent lat/lng → mərkəz sync (locate pending-i pozmamaq)
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    if (lat == null || lng == null) return;
    if (userAdjustedRef.current) return;
    if (pendingCenterRef.current) {
      const pending = pendingCenterRef.current;
      if (coordsNear(pending.lat, pending.lng, lat, lng)) return;
    }
    const center = mapRef.current.getCenter();
    if (center && coordsNear(center.lat(), center.lng(), lat, lng)) {
      return;
    }
    setViewProgrammatic(lat, lng);
  }, [ready, lat, lng, setViewProgrammatic]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setOptions({
      draggable: !disabled,
      gestureHandling: disabled ? 'none' : 'greedy',
    });
  }, [disabled, ready]);

  useEffect(() => {
    if (!autoLocate || disabled || !ready) return;
    if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
      return;
    }
    // Safari: useEffect jest sayılmır → PERMISSION_DENIED, bəzən səhifə boyu zəhərlənir
    if (!shouldAutoRequestGeolocation()) return;

    const controller = beginLocateSignal();
    const gen = ++locateGenRef.current;
    let cancelled = false;
    userAdjustedRef.current = false;

    void (async () => {
      setGeoBusy(true);
      setError(null);
      armGeoHint();
      try {
        await resolveUserLocation(gen, () => cancelled, {
          allowQuickReading: false,
          highAccuracyWaitMs: Math.max(15_000, defaultHighAccuracyWaitMs()),
          signal: controller.signal,
        });
      } catch (err) {
        if (cancelled || gen !== locateGenRef.current) return;
        if (err instanceof GeoPositionError && err.code === 'permission_denied') {
          return;
        }
        if (err instanceof GeoPositionError && err.code === 'aborted') {
          return;
        }
        setError(err instanceof GeoPositionError ? err.message : 'Mövqe alınmadı');
      } finally {
        if (!cancelled && gen === locateGenRef.current) {
          clearGeoHint();
          setGeoBusy(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLocate, disabled, ready, resolveUserLocation]);

  const addressLabel = resolvedAddress?.trim() || (hasSelection ? 'Seçilmiş mövqe' : null);
  const accuracyHint = geoAccuracyHint(accuracyM);

  if (!hasApiKey) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground',
          className,
        )}
        role="status"
      >
        Google xəritə üçün API açarı təyin olunmayıb.
        <span className="mt-1 block text-xs">
          <code className="text-foreground">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> əlavə edin və
          Google Cloud-da Maps JavaScript API-ni aktivləşdirin.
        </span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className={cn(
          'group/map relative isolate overflow-hidden rounded-2xl',
          'ring-1 ring-border/80',
          'shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)]',
          disabled && 'opacity-70',
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-10 bg-gradient-to-b from-background/35 to-transparent"
          aria-hidden
        />

        <div
          ref={containerRef}
          className="location-map-canvas z-0 h-[260px] w-full sm:h-[300px]"
          role="application"
          aria-label="Mövqe seçimi xəritəsi"
        />

        <div className="absolute right-3 top-3 z-[4] flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-md backdrop-blur-sm">
          <button
            type="button"
            disabled={disabled || !ready}
            aria-label="Yaxınlaşdır"
            className="flex h-10 w-10 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:opacity-40"
            onClick={() => {
              const map = mapRef.current;
              if (!map) return;
              // Zoom idle commit etməsin
              programmaticRef.current = true;
              suppressIdleUntilRef.current = Date.now() + PROGRAMMATIC_IDLE_SUPPRESS_MS;
              map.setZoom((map.getZoom() ?? 13) + 1);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
          <div className="h-px bg-border/70" aria-hidden />
          <button
            type="button"
            disabled={disabled || !ready}
            aria-label="Uzaqlaşdır"
            className="flex h-10 w-10 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:opacity-40"
            onClick={() => {
              const map = mapRef.current;
              if (!map) return;
              programmaticRef.current = true;
              suppressIdleUntilRef.current = Date.now() + PROGRAMMATIC_IDLE_SUPPRESS_MS;
              map.setZoom((map.getZoom() ?? 13) - 1);
            }}
          >
            <Minus className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <button
          type="button"
          disabled={disabled || geoBusy || !ready}
          onClick={() => locateMe()}
          aria-label="Mənim mövqeyimə get"
          aria-busy={geoBusy}
          className={cn(
            'absolute bottom-[4.75rem] right-3 z-[4] flex h-11 w-11 items-center justify-center',
            'rounded-full border border-border/70 bg-card/95 text-foreground shadow-md backdrop-blur-sm',
            'transition-colors hover:bg-brand hover:text-brand-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
            'disabled:pointer-events-none disabled:opacity-50',
            'sm:bottom-[5.25rem]',
            !hasSelection &&
              !geoBusy &&
              !shouldAutoRequestGeolocation() &&
              'bg-brand text-brand-foreground ring-2 ring-brand',
          )}
        >
          {geoBusy ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <LocateFixed className="h-5 w-5" aria-hidden />
          )}
        </button>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] bg-gradient-to-t from-background/95 via-background/55 to-transparent px-3 pb-3 pt-10">
          <div
            className={cn(
              'rounded-xl border border-border/60 bg-card/90 px-3 py-2.5 shadow-sm backdrop-blur-md',
              'motion-safe:transition-[opacity,transform] motion-safe:duration-200',
              pinLifted ? 'translate-y-0.5 opacity-70' : 'translate-y-0 opacity-100',
            )}
            role="status"
            aria-live="polite"
          >
            {reverseBusy || geoBusy ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                {geoBusy
                  ? (geoHint ?? 'Dəqiq mövqe axtarılır…')
                  : 'Yazılı ünvan dəqiqləşdirilir…'}
              </p>
            ) : addressLabel ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium leading-snug text-foreground">
                  {addressLabel}
                </p>
                {accuracyM != null ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Dəqiqlik ±{accuracyM} m
                    {accuracyHint ? ` — ${accuracyHint}` : ''}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Xəritəni sürüşdürərək dəqiqləşdirin
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {!shouldAutoRequestGeolocation() && !hasSelection
                  ? 'Mövqeyiniz üçün sağdakı sarı düyməyə basın'
                  : 'Xəritəni sürüşdürün — pin dəqiq yeri göstərir'}
              </p>
            )}
          </div>
        </div>

        {!ready && !error ? (
          <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-2 bg-muted/50 backdrop-blur-[2px]">
            <Loader2 className="h-6 w-6 animate-spin text-brand-foreground" aria-hidden />
            <span className="text-xs text-muted-foreground">Google xəritə hazırlanır…</span>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
