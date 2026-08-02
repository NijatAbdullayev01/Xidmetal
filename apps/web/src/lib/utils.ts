import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number, currency = 'AZN'): string {
  if (amount === 0) {
    return 'Razılaşma ilə';
  }

  const formatted = new Intl.NumberFormat('az-AZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formatted} ${currency}`;
}

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

/** Tarixi Azərbaycan formatında göstərir: «12 iyul 2026» */
export function formatDate(date: string | Date): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  const day = parsed.getDate();
  const month = AZ_MONTHS[parsed.getMonth()];
  const year = parsed.getFullYear();

  return `${day} ${month} ${year}`;
}

/** Tarix və saatı Azərbaycan formatında göstərir */
export function formatDateTime(date: string | Date): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  const datePart = formatDate(parsed);
  const timePart = new Intl.DateTimeFormat('az-AZ', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);

  return `${datePart}, ${timePart}`;
}

/** datetime-local input üçün lokal vaxt */
export function toDateTimeLocalValue(date: string | Date): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const offset = parsed.getTimezoneOffset();
  const local = new Date(parsed.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

/** Tarix + saatı Azərbaycan vaxtı (UTC+4) ISO datetime-a çevirir */
export function combineDateAndTime(date: string, time: string): string {
  const combined = new Date(`${date}T${time}:00+04:00`);
  if (Number.isNaN(combined.getTime())) {
    throw new Error('Tarix və ya saat düzgün deyil');
  }
  return combined.toISOString();
}

/** ISO datetime-dan Asia/Baku HH:mm */
export function formatTimeInBaku(iso: string | Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Baku',
  }).formatToParts(new Date(iso));
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}
