import { BookingType } from './enums';

/** Azərbaycan vaxtı — DST yoxdur (UTC+4). */
export const BAKU_TIMEZONE = 'Asia/Baku';

const AZ_MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avqust',
  'sentyabr',
  'oktyabr',
  'noyabr',
  'dekabr',
] as const;

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

type AzDateTimeParts = {
  year: number;
  monthIndex: number;
  day: number;
  hour: number;
  minute: number;
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function parseDateOnly(value: string): AzDateTimeParts | null {
  const match = DATE_ONLY_RE.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, monthIndex: month - 1, day, hour: 0, minute: 0 };
}

function partsFromInstant(date: Date): AzDateTimeParts | null {
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BAKU_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const raw = parts.find((part) => part.type === type)?.value;
    return raw === undefined ? Number.NaN : Number(raw);
  };

  const year = read('year');
  const month = read('month');
  const day = read('day');
  let hour = read('hour');
  const minute = read('minute');
  if (hour === 24) hour = 0;

  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    return null;
  }

  return {
    year,
    monthIndex: month - 1,
    day,
    hour,
    minute,
  };
}

function resolveAzDateTime(input: string | Date): AzDateTimeParts | null {
  if (typeof input === 'string') {
    const dateOnly = parseDateOnly(input);
    if (dateOnly) return dateOnly;
    return partsFromInstant(new Date(input));
  }
  return partsFromInstant(input);
}

function formatAzDateFromParts(parts: AzDateTimeParts): string {
  return `${parts.day} ${AZ_MONTHS[parts.monthIndex]} ${parts.year}`;
}

function formatAzTimeFromParts(parts: AzDateTimeParts): string {
  return `${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

/** Tarix — Bakı vaxtı: «27 avqust 2026». `YYYY-MM-DD` təqvim günü kimi saxlanır. */
export function formatAzDate(input: string | Date): string {
  const parts = resolveAzDateTime(input);
  if (!parts) return '—';
  return formatAzDateFromParts(parts);
}

/** Saat — Bakı, 24 saat: «18:00» */
export function formatAzTime(input: string | Date): string {
  const parts = resolveAzDateTime(input);
  if (!parts) return '—';
  return formatAzTimeFromParts(parts);
}

/** Tarix və saat — Bakı: «27 avqust 2026, 18:00» */
export function formatAzDateTime(input: string | Date): string {
  const parts = resolveAzDateTime(input);
  if (!parts) return '—';
  return `${formatAzDateFromParts(parts)}, ${formatAzTimeFromParts(parts)}`;
}

/** Həftə sonu (Azərbaycan: Şənbə=Bazar=istirahət; Bazar ertəsi–Cümə iş günü). */
export function isAzBusinessDay(date: Date): boolean {
  const day = date.getDay(); // 0=Bazar, 6=Şənbə
  return day !== 0 && day !== 6;
}

/**
 * Verilən andan `count` iş günü sonrasını qaytarır (həftə sonlarını keçərək).
 * Məs. cümə günü +1 iş günü → bazar ertəsi.
 */
export function addAzBusinessDays(from: Date, count: number): Date {
  const result = new Date(from.getTime());
  let remaining = count;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (isAzBusinessDay(result)) {
      remaining -= 1;
    }
  }
  return result;
}

/**
 * Sifariş kartında göstərilən vaxt:
 * SCHEDULED — təyin olunmuş slot; INSTANT — yaradılma vaxtı (slot yoxdur).
 */
export function formatBookingDateTime(booking: {
  type: BookingType | string;
  createdAt: string | Date;
  scheduledAt: string | Date;
}): string {
  return formatAzDateTime(
    booking.type === BookingType.INSTANT ? booking.createdAt : booking.scheduledAt,
  );
}
