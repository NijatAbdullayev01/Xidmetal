import { describe, expect, it } from 'vitest';
import {
  BookingStatus,
  isBookingTransitionAllowed,
  isCancellableBookingStatus,
  isBookingMessagingEnabled,
  isBookingPriceVisibleToCustomer,
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

  it('admin sifariş statusunu dəyişə bilməz', () => {
    expect(
      isBookingTransitionAllowed(BookingStatus.PENDING, BookingStatus.COMPLETED, {
        isProvider: false,
        isCustomer: false,
        isAdmin: true,
      }),
    ).toBe(false);
    expect(
      isBookingTransitionAllowed(BookingStatus.EN_ROUTE, BookingStatus.CANCELLED, {
        isProvider: false,
        isCustomer: false,
        isAdmin: true,
      }),
    ).toBe(false);
  });

  it('ACTIVE_BOOKING_STATUSES EN_ROUTE/ARRIVED daxildir', () => {
    expect(ACTIVE_BOOKING_STATUSES).toContain(BookingStatus.EN_ROUTE);
    expect(ACTIVE_BOOKING_STATUSES).toContain(BookingStatus.ARRIVED);
  });

  it('qiymət yalnız xidmət verən qəbul etdikdən sonra xidmət alanda görünür', () => {
    expect(isBookingPriceVisibleToCustomer(BookingStatus.PENDING)).toBe(false);
    expect(isBookingPriceVisibleToCustomer(BookingStatus.REJECTED)).toBe(false);
    expect(
      isBookingPriceVisibleToCustomer(BookingStatus.CANCELLED, null),
    ).toBe(false);
    expect(isBookingPriceVisibleToCustomer(BookingStatus.CONFIRMED)).toBe(true);
    expect(isBookingPriceVisibleToCustomer(BookingStatus.EN_ROUTE)).toBe(true);
    expect(isBookingPriceVisibleToCustomer(BookingStatus.ARRIVED)).toBe(true);
    expect(isBookingPriceVisibleToCustomer(BookingStatus.IN_PROGRESS)).toBe(true);
    expect(isBookingPriceVisibleToCustomer(BookingStatus.COMPLETED)).toBe(true);
    expect(
      isBookingPriceVisibleToCustomer(
        BookingStatus.CANCELLED,
        '2026-08-27T10:00:00.000Z',
      ),
    ).toBe(true);
  });

  it('mesaj yalnız qəbuldan sonra (təcili və rezervasiya eyni qayda)', () => {
    expect(isBookingMessagingEnabled(BookingStatus.PENDING)).toBe(false);
    expect(isBookingMessagingEnabled(BookingStatus.REJECTED)).toBe(false);
    expect(isBookingMessagingEnabled(BookingStatus.CANCELLED)).toBe(false);
    expect(isBookingMessagingEnabled(BookingStatus.CONFIRMED)).toBe(true);
    expect(isBookingMessagingEnabled(BookingStatus.EN_ROUTE)).toBe(true);
    expect(isBookingMessagingEnabled(BookingStatus.ARRIVED)).toBe(true);
    expect(isBookingMessagingEnabled(BookingStatus.IN_PROGRESS)).toBe(true);
    expect(isBookingMessagingEnabled(BookingStatus.COMPLETED)).toBe(false);
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
