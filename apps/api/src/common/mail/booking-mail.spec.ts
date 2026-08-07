import { describe, expect, it } from 'vitest';
import { BookingStatus, NotificationType } from '@xidmetal/shared';
import {
  bookingStatusToMailEvent,
  buildBookingMailContent,
} from './booking-mail';

describe('bookingStatusToMailEvent', () => {
  it('kritik statusları map edir', () => {
    expect(bookingStatusToMailEvent(BookingStatus.CONFIRMED)).toBe(
      NotificationType.BOOKING_CONFIRMED,
    );
    expect(bookingStatusToMailEvent(BookingStatus.REJECTED)).toBe(
      NotificationType.BOOKING_REJECTED,
    );
    expect(bookingStatusToMailEvent(BookingStatus.CANCELLED)).toBe(
      NotificationType.BOOKING_CANCELLED,
    );
    expect(bookingStatusToMailEvent(BookingStatus.PENDING)).toBeNull();
    expect(bookingStatusToMailEvent(BookingStatus.EN_ROUTE)).toBe(
      NotificationType.BOOKING_EN_ROUTE,
    );
    expect(bookingStatusToMailEvent(BookingStatus.ARRIVED)).toBe(
      NotificationType.BOOKING_ARRIVED,
    );
  });
});

describe('buildBookingMailContent', () => {
  it('REJECTED üçün ayrıca məzmun verir', () => {
    const content = buildBookingMailContent({
      event: NotificationType.BOOKING_REJECTED,
      serviceTitle: 'Təmizlik',
    });
    expect(content?.subject).toContain('rədd');
    expect(content?.body).toContain('Təmizlik');
  });

  it('CREATED üçün provider mətnini qaytarır', () => {
    const content = buildBookingMailContent({
      event: NotificationType.BOOKING_CREATED,
      serviceTitle: 'Usta',
      scheduledAtLabel: '1 yanvar 2026, 10:00',
    });
    expect(content?.subject).toContain('Yeni sifariş');
    expect(content?.body).toContain('Usta');
  });
});
