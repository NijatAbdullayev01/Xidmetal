import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { isWebKitGeolocationEngine } from '@/lib/geolocation';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';

type MapsWithRendering = typeof google.maps & {
  RenderingType?: { readonly RASTER: google.maps.RenderingType };
};

/** Koordinat / mock string — ünvan sahəsinə yazılmamalıdır */
const COORD_LIKE =
  /^\s*-?\d{1,3}(?:\.\d+)?\s*,\s*-?\d{1,3}(?:\.\d+)?(?:\s*\(mock\))?\s*$/i;

let configured = false;

/** Client Google Maps JS API açarı mövcuddursa true. */
export function hasGoogleMapsApiKey(): boolean {
  return API_KEY.length > 0;
}

function ensureConfigured(): void {
  if (!API_KEY) {
    throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY təyin olunmayıb');
  }

  if (!configured) {
    setOptions({
      key: API_KEY,
      v: 'weekly',
      language: 'az',
      region: 'AZ',
    });
    configured = true;
  }
}

/**
 * Google Maps JS API-ni bir dəfə konfiqurasiya edib `maps` kitabxanasını yükləyir.
 * Singleton — Strict Mode / çoxlu picker üçün təhlükəsiz.
 *
 * Yalnız Maps JavaScript API lazımdır. Reverse geocode client-də edilmir
 * (Geocoding API ayrıca aktivləşdirmə + console xətası riski) — backend `/geo/reverse`.
 */
export async function loadGoogleMapsApi(): Promise<typeof google.maps> {
  ensureConfigured();
  await importLibrary('maps');
  return google.maps;
}

/**
 * Safari/iOS WebGL (vector) xəritədə tile və CSS overlay pin sürüşür.
 * Raster kamera konteynerin həndəsi mərkəzinə oturur.
 */
export function marketplaceMapOptions(
  maps: typeof google.maps,
  base: google.maps.MapOptions,
  flags?: { forceRaster?: boolean },
): google.maps.MapOptions {
  const useRaster = flags?.forceRaster ?? isWebKitGeolocationEngine();
  const raster =
    (maps as MapsWithRendering).RenderingType?.RASTER ??
    ('RASTER' as google.maps.RenderingType);
  return {
    ...base,
    isFractionalZoomEnabled: useRaster ? false : (base.isFractionalZoomEnabled ?? true),
    ...(useRaster ? { renderingType: raster } : {}),
  };
}

function selectionPinSvg(gradientId: string): string {
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

/** Kameranın mərkəzində native marker — CSS overlay Safari-də tile-lərdən sürüşür. */
export function createSelectionPinMarker(
  maps: typeof google.maps,
  map: google.maps.Map,
  gradientId: string,
): google.maps.Marker {
  const position = map.getCenter() ?? { lat: 40.4093, lng: 49.8671 };
  return new maps.Marker({
    map,
    position,
    clickable: false,
    draggable: false,
    optimized: false,
    zIndex: 1000,
    title: 'Seçilmiş mövqe',
    icon: {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(selectionPinSvg(gradientId))}`,
      scaledSize: new maps.Size(36, 48),
      anchor: new maps.Point(18, 48),
    },
  });
}

/** İnsan oxuna bilən ünvan deyil (koordinat və s.) — false. */
export function isHumanReadableAddress(value: string | null | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  if (COORD_LIKE.test(trimmed)) return false;
  return true;
}

function encodeLatLngQuery(lat: number, lng: number): string {
  return encodeURIComponent(`${lat},${lng}`);
}

/** Nöqtəni Google Maps-də açır (baxış). */
export function googleMapsPlaceUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeLatLngQuery(lat, lng)}`;
}

/** Ünvan mətnini Google Maps-də açır. */
export function googleMapsPlaceQueryUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}`;
}

/** Nöqtəyə yol tarifi (xidmət verən naviqasiyası). */
export function googleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeLatLngQuery(lat, lng)}`;
}

/** Ünvan mətninə yol tarifi. */
export function googleMapsDirectionsQueryUrl(query: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query.trim())}`;
}
