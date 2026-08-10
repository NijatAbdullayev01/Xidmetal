import { describe, expect, it } from 'vitest';
import { NotificationType, UserRole } from '@xidmetal/shared';
import { resolveNotificationHref, sanitizeInternalPath } from './notification-href';

describe('sanitizeInternalPath', () => {
  it('yalnız eyni-origin relative path qəbul edir', () => {
    expect(sanitizeInternalPath('/dashboard/customer')).toBe('/dashboard/customer');
    expect(sanitizeInternalPath('https://evil.com')).toBeNull();
    expect(sanitizeInternalPath('//evil.com')).toBeNull();
    expect(sanitizeInternalPath('dashboard')).toBeNull();
  });

  it('backslash və host-hijack open redirect-i bloklayır', () => {
    expect(sanitizeInternalPath('/\\evil.com')).toBeNull();
    expect(sanitizeInternalPath('/\\\\evil.com')).toBeNull();
    expect(sanitizeInternalPath('/%5cevil.com')).toBeNull();
    expect(sanitizeInternalPath('/%5Cevil.com')).toBeNull();
  });
});

describe('resolveNotificationHref', () => {
  it('sifariş bildirişini bookings səhifəsinə aparır', () => {
    expect(
      resolveNotificationHref(
        { type: NotificationType.BOOKING_CREATED, data: { bookingId: 'b1' } },
        UserRole.PROVIDER,
      ),
    ).toBe('/dashboard/provider/bookings');
  });

  it('REJECTED bildirişini bookings-ə aparır', () => {
    expect(
      resolveNotificationHref(
        { type: NotificationType.BOOKING_REJECTED, data: { bookingId: 'b2' } },
        UserRole.CUSTOMER,
      ),
    ).toBe('/dashboard/customer/bookings');
  });

  it('RESCHEDULE_REJECTED bildirişini bookings-ə aparır', () => {
    expect(
      resolveNotificationHref(
        {
          type: NotificationType.BOOKING_RESCHEDULE_REJECTED,
          data: { bookingId: 'b3' },
        },
        UserRole.PROVIDER,
      ),
    ).toBe('/dashboard/provider/bookings');
  });

  it('rəy bildirişini ratings-ə aparır', () => {
    expect(
      resolveNotificationHref(
        { type: NotificationType.REVIEW_RECEIVED, data: null },
        UserRole.PROVIDER,
      ),
    ).toBe('/dashboard/provider/ratings');
  });

  it('admin href-i üstün tutur', () => {
    expect(
      resolveNotificationHref(
        {
          type: NotificationType.ADMIN_ANNOUNCEMENT,
          data: { href: '/dashboard/customer/settings' },
        },
        UserRole.CUSTOMER,
      ),
    ).toBe('/dashboard/customer/settings');
  });

  it('open redirect-i bloklayır', () => {
    expect(
      resolveNotificationHref(
        {
          type: NotificationType.ADMIN_ANNOUNCEMENT,
          data: { href: 'https://phish.example' },
        },
        UserRole.CUSTOMER,
      ),
    ).toBe('/dashboard/customer');
  });
});
