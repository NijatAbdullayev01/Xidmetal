import { BookingStatus, BookingType } from './enums';

/**
 * Provider icazəli keçidlər (hədəf lifecycle).
 * CONFIRMED → IN_PROGRESS birbaşa keçid yoxdur — EN_ROUTE → ARRIVED vasitəsilə.
 */
export const PROVIDER_BOOKING_TRANSITIONS: Partial<
  Record<BookingStatus, readonly BookingStatus[]>
> = {
  [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.REJECTED],
  [BookingStatus.CONFIRMED]: [BookingStatus.EN_ROUTE, BookingStatus.CANCELLED],
  [BookingStatus.EN_ROUTE]: [BookingStatus.ARRIVED, BookingStatus.CANCELLED],
  [BookingStatus.ARRIVED]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
  [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED],
};

/** Xidmət alan yalnız ləğv (iş başladıqdan sonra ləğv yox) */
export const CUSTOMER_BOOKING_TRANSITIONS: Partial<
  Record<BookingStatus, readonly BookingStatus[]>
> = {
  [BookingStatus.PENDING]: [BookingStatus.CANCELLED],
  [BookingStatus.CONFIRMED]: [BookingStatus.CANCELLED],
  [BookingStatus.EN_ROUTE]: [BookingStatus.CANCELLED],
  [BookingStatus.ARRIVED]: [BookingStatus.CANCELLED],
};

/**
 * Slot / hesab silmə üçün «aktiv» sifarişlər —
 * hələ tutulan vaxt pəncərəsi olan statuslar.
 */
export const ACTIVE_BOOKING_STATUSES: readonly BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.IN_PROGRESS,
] as const;

/**
 * Təcili axtarış (INSTANT + PENDING) hələ icraçıya bağlanmayıb —
 * komanda tutumunu tutmur. Planlaşdırılmış PENDING rezervasiyadır.
 */
export const INSTANT_CAPACITY_HOLDING_STATUSES: readonly BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.IN_PROGRESS,
] as const;

export function bookingHoldsServiceCapacity(
  type: BookingType | string,
  status: BookingStatus | string,
): boolean {
  if (type === BookingType.INSTANT) {
    return (INSTANT_CAPACITY_HOLDING_STATUSES as readonly string[]).includes(status);
  }
  return (ACTIVE_BOOKING_STATUSES as readonly string[]).includes(status);
}

/** Şirkət: aktiv komanda sayı; fərdi: həmişə 1 */
export function effectiveServiceCapacity(
  accountType: string | null | undefined,
  activeTeamCount: number,
): number {
  if (accountType === 'COMPANY') {
    return Math.max(1, activeTeamCount);
  }
  return 1;
}

export function isSlotAtCapacity(occupied: number, capacity: number): boolean {
  return occupied >= Math.max(1, capacity);
}

export function isBookingTransitionAllowed(
  current: BookingStatus,
  next: BookingStatus,
  roles: { isProvider: boolean; isCustomer: boolean; isAdmin: boolean },
): boolean {
  if (current === next) return true;
  if (roles.isAdmin) return false;

  const allowed = roles.isProvider
    ? (PROVIDER_BOOKING_TRANSITIONS[current] ?? [])
    : roles.isCustomer
      ? (CUSTOMER_BOOKING_TRANSITIONS[current] ?? [])
      : [];

  return allowed.includes(next);
}

export function isCancellableBookingStatus(status: BookingStatus): boolean {
  return (
    status === BookingStatus.PENDING ||
    status === BookingStatus.CONFIRMED ||
    status === BookingStatus.EN_ROUTE ||
    status === BookingStatus.ARRIVED
  );
}

/**
 * Təcili sifariş qəbul olunub, iş hələ başlamayıb —
 * xidmət alan qiyməti bəyənməsə başqa xidmət verən axtara bilər.
 */
export function isInstantProviderSkippable(
  type: BookingType | string,
  status: BookingStatus | string,
): boolean {
  return type === BookingType.INSTANT && status === BookingStatus.CONFIRMED;
}

/**
 * Sifarişə bağlı söhbət — xidmət verən qəbul etdikdən sonra,
 * tamamlanana qədər (təcili dispatch və rezervasiya eyni qayda).
 */
export function isBookingMessagingEnabled(status: BookingStatus | string): boolean {
  return (
    status === BookingStatus.CONFIRMED ||
    status === BookingStatus.EN_ROUTE ||
    status === BookingStatus.ARRIVED ||
    status === BookingStatus.IN_PROGRESS
  );
}

export function bookingMessagingBlockedMessage(status: BookingStatus | string): string {
  if (status === BookingStatus.COMPLETED) {
    return 'Tamamlanmış sifarişdə mesaj yazıla bilməz';
  }
  if (status === BookingStatus.CANCELLED) {
    return 'Ləğv edilmiş sifarişdə mesaj yazıla bilməz';
  }
  if (status === BookingStatus.REJECTED) {
    return 'Rədd edilmiş sifarişdə mesaj yazıla bilməz';
  }
  return 'Mesaj yazmaq üçün xidmət verən sifarişi qəbul etməlidir';
}

/**
 * Sifariş qiyməti yalnız xidmət verən qəbul etdikdən sonra xidmət alanda görünür.
 * Xidmət verən tərəfdə qiymət göstərilmir.
 */
export function isBookingPriceVisibleToCustomer(
  status: BookingStatus | string,
  acceptedAt?: string | Date | null,
): boolean {
  if (acceptedAt) return true;
  return isBookingMessagingEnabled(status) || status === BookingStatus.COMPLETED;
}

/**
 * Təcili sifarişdə xidmət verənin reytinqi yalnız qəbuldan sonra görünür.
 * Axtarış zamanı kataloq sahibi hələ icraçı deyil.
 */
export function isBookingProviderRatingVisible(
  type: BookingType | string,
  acceptedAt?: string | Date | null,
): boolean {
  if (type === BookingType.INSTANT) return Boolean(acceptedAt);
  return true;
}

export interface BookingLifecycleTimestamps {
  acceptedAt?: Date | null;
  enRouteAt?: Date | null;
  arrivedAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
}

/** Statusa keçiddə doldurulmalı audit sahəsi (yalnız boşdursa). */
export function bookingLifecycleFieldsForStatus(
  status: BookingStatus,
  existing: BookingLifecycleTimestamps,
  now: Date,
): Partial<
  Record<'acceptedAt' | 'enRouteAt' | 'arrivedAt' | 'startedAt' | 'completedAt', Date>
> {
  switch (status) {
    case BookingStatus.CONFIRMED:
      return existing.acceptedAt ? {} : { acceptedAt: now };
    case BookingStatus.EN_ROUTE:
      return existing.enRouteAt ? {} : { enRouteAt: now };
    case BookingStatus.ARRIVED:
      return existing.arrivedAt ? {} : { arrivedAt: now };
    case BookingStatus.IN_PROGRESS:
      return existing.startedAt ? {} : { startedAt: now };
    case BookingStatus.COMPLETED:
      return existing.completedAt ? {} : { completedAt: now };
    default:
      return {};
  }
}
