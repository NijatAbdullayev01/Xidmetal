import { describe, expect, it } from 'vitest';
import { BookingStatus, NotificationType } from '@xidmetal/shared';
import {
  bookingStatusToMailEvent,
  buildBookingMailContent,
  buildBookingMailThread,
  shouldSendCustomerStatusMail,
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

describe('shouldSendCustomerStatusMail', () => {
  it('sifariş e-poçtları müvəqqəti bağlıdır', () => {
    expect(shouldSendCustomerStatusMail(BookingStatus.CONFIRMED)).toBe(false);
    expect(shouldSendCustomerStatusMail(BookingStatus.COMPLETED)).toBe(false);
    expect(shouldSendCustomerStatusMail(BookingStatus.REJECTED)).toBe(false);
    expect(shouldSendCustomerStatusMail(BookingStatus.EN_ROUTE)).toBe(false);
    expect(shouldSendCustomerStatusMail(BookingStatus.ARRIVED)).toBe(false);
    expect(shouldSendCustomerStatusMail(BookingStatus.IN_PROGRESS)).toBe(false);
    expect(shouldSendCustomerStatusMail(BookingStatus.CANCELLED)).toBe(false);
    expect(shouldSendCustomerStatusMail(BookingStatus.PENDING)).toBe(false);
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

  it('sifariş nömrəsini mətnə əlavə edir', () => {
    const content = buildBookingMailContent({
      event: NotificationType.BOOKING_CONFIRMED,
      serviceTitle: 'Təmizlik',
      orderNumber: 'XM-26-000421',
    });
    expect(content?.body).toContain('Sifariş nömrəsi: XM-26-000421');
    expect(content?.subject).toBe('Xidmətal — Sifariş № XM-26-000421');
  });

  it('eyni sifarişin təsdiqi və tamamlanması eyni mövzuda qalır', () => {
    const confirmed = buildBookingMailContent({
      event: NotificationType.BOOKING_CONFIRMED,
      serviceTitle: 'Təmizlik',
      orderNumber: 'XM-26-000421',
    });
    const completed = buildBookingMailContent({
      event: NotificationType.BOOKING_COMPLETED,
      serviceTitle: 'Təmizlik',
      orderNumber: 'XM-26-000421',
    });
    expect(confirmed?.subject).toBe(completed?.subject);
    expect(confirmed?.intro).toContain('təsdiqləndi');
    expect(completed?.intro).toContain('tamamlandı');
    expect(completed?.body).not.toContain('rəy');
  });

  it('fərqli sifariş nömrələri fərqli mövzu alır', () => {
    const first = buildBookingMailContent({
      event: NotificationType.BOOKING_CONFIRMED,
      serviceTitle: 'Təmizlik',
      orderNumber: 'XM-26-000421',
    });
    const second = buildBookingMailContent({
      event: NotificationType.BOOKING_CONFIRMED,
      serviceTitle: 'Təmizlik',
      orderNumber: 'XM-26-000422',
    });
    expect(first?.subject).not.toBe(second?.subject);
  });
});

describe('buildBookingMailThread', () => {
  it('eyni sifariş üçün sabit entity ref saxlayır', () => {
    const first = buildBookingMailThread({
      orderNumber: 'XM-26-000421',
      uniqueSuffix: 'confirmed-1',
    });
    const second = buildBookingMailThread({
      orderNumber: 'XM-26-000421',
      uniqueSuffix: 'completed-2',
    });
    expect(first?.entityRefId).toBe('booking-XM-26-000421');
    expect(second?.entityRefId).toBe(first?.entityRefId);
    expect(first?.messageId).toBe('<booking-XM-26-000421-confirmed-1@xidmetal.com>');
    expect(first?.messageId).not.toBe(second?.messageId);
  });

  it('fərqli sifarişlər fərqli söhbət kökü alır', () => {
    const first = buildBookingMailThread({
      orderNumber: 'XM-26-000421',
      uniqueSuffix: 'a',
    });
    const second = buildBookingMailThread({
      orderNumber: 'XM-26-000422',
      uniqueSuffix: 'a',
    });
    expect(first?.entityRefId).not.toBe(second?.entityRefId);
    expect(first?.messageId).not.toBe(second?.messageId);
  });
});
