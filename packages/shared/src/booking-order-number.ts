/** Xidmətal sifariş nömrəsi — istifadəçiyə görünən, dəyişməz referans. */

export const BOOKING_ORDER_NUMBER_PREFIX = 'XM';
export const BOOKING_ORDER_NUMBER_SEQ_PAD = 6;
export const BOOKING_ORDER_NUMBER_TIMEZONE = 'Asia/Baku';

/** `XM-YY-NNNNNN` (seq 1M-dən sonra 7–8 rəqəm ola bilər) */
export const BOOKING_ORDER_NUMBER_RE = /^XM-\d{2}-\d{6,8}$/;

export function bakuYearTwoDigit(at: Date = new Date()): string {
  const year = new Intl.DateTimeFormat('en-US', {
    timeZone: BOOKING_ORDER_NUMBER_TIMEZONE,
    year: 'numeric',
  }).format(at);
  return year.slice(-2);
}

export function formatBookingOrderNumber(
  seq: number,
  at: Date = new Date(),
): string {
  if (!Number.isInteger(seq) || seq < 1) {
    throw new RangeError('Sifariş nömrəsi ardıcıllığı müsbət tam ədəd olmalıdır');
  }
  const padded = String(seq).padStart(BOOKING_ORDER_NUMBER_SEQ_PAD, '0');
  return `${BOOKING_ORDER_NUMBER_PREFIX}-${bakuYearTwoDigit(at)}-${padded}`;
}

/** Axtarış/daxil etmə: boşluqları atır, böyük hərf. Format uyğun deyilsə null. */
export function normalizeBookingOrderNumber(input: string): string | null {
  const compact = input.trim().toUpperCase().replace(/\s+/g, '');
  return BOOKING_ORDER_NUMBER_RE.test(compact) ? compact : null;
}

export function isBookingOrderNumber(value: string): boolean {
  return BOOKING_ORDER_NUMBER_RE.test(value.trim().toUpperCase());
}

export function bookingOrderNumberLabel(orderNumber: string): string {
  return `Sifariş № ${orderNumber}`;
}

export type BookingOrderNumberSearchFilter =
  | { type: 'equals'; value: string }
  | { type: 'contains'; value: string };

/** Mətndə tam `XM-YY-NNNNNN` (defis/boşluq olmasa da). */
const FULL_ORDER_NUMBER_IN_TEXT_RE = /XM\s*-?\s*\d{2}\s*-?\s*\d{6,8}/i;
/** İl + opsional ardıcıllıq prefiksi (`XM-26`, `XM-26-000`). */
const PREFIX_ORDER_NUMBER_IN_TEXT_RE = /XM\s*-?\s*\d{2}(?:\s*-?\s*\d{1,8})?/i;

function compactAlphanumeric(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function formatFromCompact(compact: string): string | null {
  const match = compact.match(/^XM(\d{2})(\d{6,8})$/);
  if (!match) return null;
  return `${BOOKING_ORDER_NUMBER_PREFIX}-${match[1]}-${match[2]}`;
}

/**
 * Siyahı axtarışı: tam nömrə → dəqiq uyğunluq (indeks);
 * prefiks və ya 3–8 rəqəm → `contains`.
 * «Sifariş № …» kimi əlavə mətn də qəbul olunur.
 */
export function parseBookingOrderNumberSearch(
  input: string,
): BookingOrderNumberSearchFilter | null {
  const raw = input.trim();
  if (!raw) return null;

  const full = raw.match(FULL_ORDER_NUMBER_IN_TEXT_RE);
  if (full) {
    const formatted = formatFromCompact(compactAlphanumeric(full[0]));
    if (formatted) return { type: 'equals', value: formatted };
  }

  const prefix = raw.match(PREFIX_ORDER_NUMBER_IN_TEXT_RE);
  if (prefix) {
    const compact = compactAlphanumeric(prefix[0]);
    const formatted = formatFromCompact(compact);
    if (formatted) return { type: 'equals', value: formatted };
    const parts = compact.match(/^XM(\d{2})(\d*)$/);
    if (parts) {
      const value = parts[2]
        ? `${BOOKING_ORDER_NUMBER_PREFIX}-${parts[1]}-${parts[2]}`
        : `${BOOKING_ORDER_NUMBER_PREFIX}-${parts[1]}`;
      return { type: 'contains', value };
    }
  }

  const compactAll = compactAlphanumeric(raw);
  if (/^\d{3,8}$/.test(compactAll)) {
    return { type: 'contains', value: compactAll };
  }

  return null;
}
