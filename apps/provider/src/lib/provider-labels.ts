import { ServiceStatus, BookingStatus, BookingType } from '@xidmetal/shared';

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  [ServiceStatus.DRAFT]: 'Qaralama',
  [ServiceStatus.PENDING_REVIEW]: 'Yoxlama gözləyir',
  [ServiceStatus.NEEDS_REVISION]: 'Düzəliş lazımdır',
  [ServiceStatus.ACTIVE]: 'Aktiv',
  [ServiceStatus.PAUSED]: 'Dayandırılıb',
  [ServiceStatus.ARCHIVED]: 'Arxiv',
};

export const SERVICE_STATUS_VARIANTS: Record<
  ServiceStatus,
  'default' | 'success' | 'warning' | 'destructive' | 'muted'
> = {
  [ServiceStatus.DRAFT]: 'muted',
  [ServiceStatus.PENDING_REVIEW]: 'warning',
  [ServiceStatus.NEEDS_REVISION]: 'destructive',
  [ServiceStatus.ACTIVE]: 'success',
  [ServiceStatus.PAUSED]: 'warning',
  [ServiceStatus.ARCHIVED]: 'destructive',
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'Gözləyir',
  [BookingStatus.CONFIRMED]: 'Təsdiqlənib',
  [BookingStatus.EN_ROUTE]: 'Yoldadır',
  [BookingStatus.ARRIVED]: 'Ünvanda',
  [BookingStatus.IN_PROGRESS]: 'İcra olunur',
  [BookingStatus.COMPLETED]: 'Tamamlanıb',
  [BookingStatus.CANCELLED]: 'Ləğv edilib',
  [BookingStatus.REJECTED]: 'İmtina edilib',
};

export const BOOKING_STATUS_VARIANTS: Record<
  BookingStatus,
  'default' | 'success' | 'warning' | 'destructive' | 'muted' | 'info' | 'transit' | 'arrived' | 'progress'
> = {
  [BookingStatus.PENDING]: 'warning',
  [BookingStatus.CONFIRMED]: 'info',
  [BookingStatus.EN_ROUTE]: 'transit',
  [BookingStatus.ARRIVED]: 'arrived',
  [BookingStatus.IN_PROGRESS]: 'progress',
  [BookingStatus.COMPLETED]: 'success',
  [BookingStatus.CANCELLED]: 'destructive',
  [BookingStatus.REJECTED]: 'destructive',
};

export const BOOKING_TYPE_LABELS: Record<BookingType, string> = {
  [BookingType.SCHEDULED]: 'Planlaşdırılmış',
  [BookingType.INSTANT]: 'Təcili',
};

/** Dashboard «Aktiv» tab — təsdiqdən iş bitənə qədər */
export const ACTIVE_BOOKING_TAB_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.IN_PROGRESS,
];

export {
  PRICE_UNIT_LABELS,
  getPriceUnitsForCategorySlug,
  getPriceUnitLabel,
  type PriceUnitValue,
} from '@xidmetal/shared';
