import { AZERBAIJAN_LOCATIONS } from '@xidmetal/shared';

const CATALOG_LOCATIONS_BY_LENGTH = [...AZERBAIJAN_LOCATIONS].sort(
  (a, b) => b.length - a.length,
);

const BLOCK_PREFIX = 'Blok ';
const FLOOR_PREFIX = 'Mərtəbə ';
const DOOR_PREFIX = 'Qapı ';

/** Küçə ünvanına şəhər/rayon, sonra blok / mərtəbə / qapı əlavə edir (boş hissələr atılır). */
export function composeBookingAddress(parts: {
  street: string;
  block?: string;
  floor?: string;
  door?: string;
  location?: string;
}): string {
  const segments: string[] = [];

  const location = parts.location?.trim();
  if (location) segments.push(location);

  const street = parts.street.trim();
  if (street) segments.push(street);

  const block = parts.block?.trim();
  const floor = parts.floor?.trim();
  const door = parts.door?.trim();
  if (block) segments.push(`${BLOCK_PREFIX}${block}`);
  if (floor) segments.push(`${FLOOR_PREFIX}${floor}`);
  if (door) segments.push(`${DOOR_PREFIX}${door}`);

  return segments.join(', ');
}

/** Saxlanmış ünvanı göstərmək üçün: Şəhər, Rayon, ünvan, blok, mərtəbə, qapı. */
export function formatBookingAddressDisplay(address: string): string {
  const trimmed = address.trim();
  if (!trimmed) return '';
  return composeBookingAddress(parseStoredBookingAddress(trimmed));
}

function parseStoredBookingAddress(address: string): {
  street: string;
  block?: string;
  floor?: string;
  door?: string;
  location?: string;
} {
  const extracted = extractCatalogLocation(address);
  const location = extracted?.location;
  const remainder = extracted?.remainder ?? address;

  let block: string | undefined;
  let floor: string | undefined;
  let door: string | undefined;
  const streetParts: string[] = [];

  for (const part of remainder.split(',').map((item) => item.trim()).filter(Boolean)) {
    const blockValue = valueAfterPrefix(part, BLOCK_PREFIX);
    if (blockValue) {
      block = blockValue;
      continue;
    }
    const floorValue = valueAfterPrefix(part, FLOOR_PREFIX);
    if (floorValue) {
      floor = floorValue;
      continue;
    }
    const doorValue = valueAfterPrefix(part, DOOR_PREFIX);
    if (doorValue) {
      door = doorValue;
      continue;
    }
    streetParts.push(part);
  }

  return {
    street: streetParts.join(', '),
    block,
    floor,
    door,
    location,
  };
}

function extractCatalogLocation(
  address: string,
): { location: string; remainder: string } | null {
  for (const loc of CATALOG_LOCATIONS_BY_LENGTH) {
    if (address === loc) {
      return { location: loc, remainder: '' };
    }
    if (address.startsWith(`${loc}, `)) {
      return { location: loc, remainder: address.slice(loc.length + 2).trim() };
    }
    if (address.endsWith(`, ${loc}`)) {
      return { location: loc, remainder: address.slice(0, -(loc.length + 2)).trim() };
    }
  }
  return null;
}

function valueAfterPrefix(part: string, prefix: string): string | null {
  if (!part.startsWith(prefix)) return null;
  const value = part.slice(prefix.length).trim();
  return value || null;
}
