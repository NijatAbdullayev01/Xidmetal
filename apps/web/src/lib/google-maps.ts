import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';

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

/** İnsan oxuna bilən ünvan deyil (koordinat və s.) — false. */
export function isHumanReadableAddress(value: string | null | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  if (COORD_LIKE.test(trimmed)) return false;
  return true;
}
