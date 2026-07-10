import { ServiceStatus, BookingStatus } from '@xidmetal/shared';

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  [ServiceStatus.DRAFT]: 'Qaralama',
  [ServiceStatus.ACTIVE]: 'Aktiv',
  [ServiceStatus.PAUSED]: 'Dayandırılıb',
  [ServiceStatus.ARCHIVED]: 'Arxiv',
};

export const SERVICE_STATUS_VARIANTS: Record<
  ServiceStatus,
  'default' | 'success' | 'warning' | 'destructive' | 'muted'
> = {
  [ServiceStatus.DRAFT]: 'muted',
  [ServiceStatus.ACTIVE]: 'success',
  [ServiceStatus.PAUSED]: 'warning',
  [ServiceStatus.ARCHIVED]: 'destructive',
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'Gözləyir',
  [BookingStatus.CONFIRMED]: 'Təsdiqlənib',
  [BookingStatus.IN_PROGRESS]: 'İcra olunur',
  [BookingStatus.COMPLETED]: 'Tamamlanıb',
  [BookingStatus.CANCELLED]: 'Ləğv edilib',
  [BookingStatus.REJECTED]: 'Rədd edilib',
};

export const BOOKING_STATUS_VARIANTS: Record<
  BookingStatus,
  'default' | 'success' | 'warning' | 'destructive' | 'muted'
> = {
  [BookingStatus.PENDING]: 'warning',
  [BookingStatus.CONFIRMED]: 'default',
  [BookingStatus.IN_PROGRESS]: 'default',
  [BookingStatus.COMPLETED]: 'success',
  [BookingStatus.CANCELLED]: 'muted',
  [BookingStatus.REJECTED]: 'destructive',
};

export const PRICE_UNIT_LABELS: Record<string, string> = {
  FIXED: 'Sabit',
  HOURLY: 'Saatlıq',
  DAILY: 'Günlük',
};
