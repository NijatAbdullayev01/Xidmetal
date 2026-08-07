import { describe, expect, it } from 'vitest';
import {
  BookingStatus,
  isBookingTransitionAllowed,
  isCancellableBookingStatus,
  bookingLifecycleFieldsForStatus,
  ACTIVE_BOOKING_STATUSES,
} from '@xidmetal/shared';

describe('booking status transitions (shared lifecycle)', () => {
  it('provider PENDING → CONFIRMED/REJECTED', () => {
    expect(
      isBookingTransitionAllowed(BookingStatus.PENDING, BookingStatus.CONFIRMED, {
        isProvider: true,
        isCustomer: false,
        isAdmin: false,
      }),
    ).toBe(true);
    expect(
      isBookingTransitionAllowed(BookingStatus.PENDING, BookingStatus.REJECTED, {
        isProvider: true,
        isCustomer: false,
        isAdmin: false,
      }),
    ).toBe(true);
    expect(
      isBookingTransitionAllowed(BookingStatus.PENDING, BookingStatus.COMPLETED, {
        isProvider: true,
        isCustomer: false,
        isAdmin: false,
      }),
    ).toBe(false);
  });

  it('provider CONFIRMED → EN_ROUTE (birbaşa IN_PROGRESS yox)', () => {
    expect(
      isBookingTransitionAllowed(BookingStatus.CONFIRMED, BookingStatus.EN_ROUTE, {
        isProvider: true,
        isCustomer: false,
        isAdmin: false,
      }),
    ).toBe(true);
    expect(
      isBookingTransitionAllowed(BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, {
        isProvider: true,
        isCustomer: false,
        isAdmin: false,
      }),
    ).toBe(false);
    expect(
      isBookingTransitionAllowed(BookingStatus.CONFIRMED, BookingStatus.CANCELLED, {
        isProvider: true,
        isCustomer: false,
        isAdmin: false,
      }),
    ).toBe(true);
  });

  it('provider EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED', () => {
    expect(
      isBookingTransitionAllowed(BookingStatus.EN_ROUTE, BookingStatus.ARRIVED, {
        isProvider: true,
        isCustomer: false,
        isAdmin: false,
      }),
    ).toBe(true);
    expect(
      isBookingTransitionAllowed(BookingStatus.ARRIVED, BookingStatus.IN_PROGRESS, {
        isProvider: true,
        isCustomer: false,
        isAdmin: false,
      }),
    ).toBe(true);
    expect(
      isBookingTransitionAllowed(BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED, {
        isProvider: true,
        isCustomer: false,
        isAdmin: false,
      }),
    ).toBe(true);
  });

  it('customer EN_ROUTE/ARRIVED ləğv edə bilər; IN_PROGRESS yox', () => {
    expect(
      isBookingTransitionAllowed(BookingStatus.EN_ROUTE, BookingStatus.CANCELLED, {
        isProvider: false,
        isCustomer: true,
        isAdmin: false,
      }),
    ).toBe(true);
    expect(
      isBookingTransitionAllowed(BookingStatus.ARRIVED, BookingStatus.CANCELLED, {
        isProvider: false,
        isCustomer: true,
        isAdmin: false,
      }),
    ).toBe(true);
    expect(
      isBookingTransitionAllowed(BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED, {
        isProvider: false,
        isCustomer: true,
        isAdmin: false,
      }),
    ).toBe(false);
    expect(isCancellableBookingStatus(BookingStatus.EN_ROUTE)).toBe(true);
    expect(isCancellableBookingStatus(BookingStatus.IN_PROGRESS)).toBe(false);
  });

  it('admin hər keçidi edə bilər', () => {
    expect(
      isBookingTransitionAllowed(BookingStatus.PENDING, BookingStatus.COMPLETED, {
        isProvider: false,
        isCustomer: false,
        isAdmin: true,
      }),
    ).toBe(true);
  });

  it('ACTIVE_BOOKING_STATUSES EN_ROUTE/ARRIVED daxildir', () => {
    expect(ACTIVE_BOOKING_STATUSES).toContain(BookingStatus.EN_ROUTE);
    expect(ACTIVE_BOOKING_STATUSES).toContain(BookingStatus.ARRIVED);
  });

  it('lifecycle timestamp sahələri', () => {
    const now = new Date('2026-08-07T12:00:00.000Z');
    expect(
      bookingLifecycleFieldsForStatus(BookingStatus.EN_ROUTE, {}, now),
    ).toEqual({ enRouteAt: now });
    expect(
      bookingLifecycleFieldsForStatus(
        BookingStatus.EN_ROUTE,
        { enRouteAt: now },
        now,
      ),
    ).toEqual({});
    expect(
      bookingLifecycleFieldsForStatus(BookingStatus.ARRIVED, {}, now),
    ).toEqual({ arrivedAt: now });
  });
});
