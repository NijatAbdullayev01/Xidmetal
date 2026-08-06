import { describe, expect, it } from 'vitest';
import { BookingStatus } from '@xidmetal/shared';

/**
 * bookings.service validateStatusTransition ilə eyni matrisa —
 * regression üçün saf unit test (Nest DI olmadan).
 */
function isTransitionAllowed(
  current: BookingStatus,
  next: BookingStatus,
  isProvider: boolean,
  isCustomer: boolean,
  isAdmin: boolean,
): boolean {
  if (current === next) return true;
  if (isAdmin) return true;

  const providerTransitions: Partial<Record<BookingStatus, BookingStatus[]>> = {
    [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.REJECTED],
    [BookingStatus.CONFIRMED]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
    [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED],
  };

  const customerTransitions: Partial<Record<BookingStatus, BookingStatus[]>> = {
    [BookingStatus.PENDING]: [BookingStatus.CANCELLED],
    [BookingStatus.CONFIRMED]: [BookingStatus.CANCELLED],
  };

  const allowed = isProvider
    ? providerTransitions[current] ?? []
    : isCustomer
      ? customerTransitions[current] ?? []
      : [];

  return allowed.includes(next);
}

describe('booking status transitions', () => {
  it('provider PENDING → CONFIRMED/REJECTED', () => {
    expect(
      isTransitionAllowed(BookingStatus.PENDING, BookingStatus.CONFIRMED, true, false, false),
    ).toBe(true);
    expect(
      isTransitionAllowed(BookingStatus.PENDING, BookingStatus.REJECTED, true, false, false),
    ).toBe(true);
    expect(
      isTransitionAllowed(BookingStatus.PENDING, BookingStatus.COMPLETED, true, false, false),
    ).toBe(false);
  });

  it('customer yalnız CANCELLED', () => {
    expect(
      isTransitionAllowed(BookingStatus.PENDING, BookingStatus.CANCELLED, false, true, false),
    ).toBe(true);
    expect(
      isTransitionAllowed(BookingStatus.CONFIRMED, BookingStatus.CANCELLED, false, true, false),
    ).toBe(true);
    expect(
      isTransitionAllowed(BookingStatus.PENDING, BookingStatus.CONFIRMED, false, true, false),
    ).toBe(false);
  });

  it('admin hər keçidi edə bilər', () => {
    expect(
      isTransitionAllowed(BookingStatus.PENDING, BookingStatus.COMPLETED, false, false, true),
    ).toBe(true);
  });
});
