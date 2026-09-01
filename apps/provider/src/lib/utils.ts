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

export {
  formatAzDate as formatDate,
  formatAzDateTime as formatDateTime,
  formatAzTime as formatTimeInBaku,
} from '@xidmetal/shared';

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

