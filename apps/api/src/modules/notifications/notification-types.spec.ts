import { describe, expect, it } from 'vitest';
import {
  ADMIN_NOTIFICATION_TYPES,
  BOOKING_NOTIFICATION_TYPES,
  MESSAGE_NOTIFICATION_TYPES,
  NotificationType,
  REVIEW_NOTIFICATION_TYPES,
} from '@xidmetal/shared';

/**
 * BOOKING_REJECTED booking badge allowlist-də olmalıdır —
 * notifications.service bookingTypes bu massivdən qidalanır.
 */
describe('BOOKING_NOTIFICATION_TYPES', () => {
  it('BOOKING_REJECTED daxildir', () => {
    expect(BOOKING_NOTIFICATION_TYPES).toContain(NotificationType.BOOKING_REJECTED);
  });

  it('BOOKING_EN_ROUTE və BOOKING_ARRIVED daxildir', () => {
    expect(BOOKING_NOTIFICATION_TYPES).toContain(NotificationType.BOOKING_EN_ROUTE);
    expect(BOOKING_NOTIFICATION_TYPES).toContain(NotificationType.BOOKING_ARRIVED);
  });

  it('BOOKING_IN_PROGRESS daxildir', () => {
    expect(BOOKING_NOTIFICATION_TYPES).toContain(NotificationType.BOOKING_IN_PROGRESS);
  });

  it('BOOKING_RESCHEDULE_REJECTED daxildir', () => {
    expect(BOOKING_NOTIFICATION_TYPES).toContain(
      NotificationType.BOOKING_RESCHEDULE_REJECTED,
    );
  });
});

/** Inbox / zəng yalnız admin — sifariş və mesaj buraya qarışmamalıdır */
describe('ADMIN_NOTIFICATION_TYPES (inbox)', () => {
  it('ADMIN_ANNOUNCEMENT daxildir', () => {
    expect(ADMIN_NOTIFICATION_TYPES).toContain(NotificationType.ADMIN_ANNOUNCEMENT);
  });

  it('sifariş və mesaj tipləri daxil deyil', () => {
    for (const type of [
      ...BOOKING_NOTIFICATION_TYPES,
      ...MESSAGE_NOTIFICATION_TYPES,
      ...REVIEW_NOTIFICATION_TYPES,
    ]) {
      expect(ADMIN_NOTIFICATION_TYPES).not.toContain(type);
    }
  });
});
