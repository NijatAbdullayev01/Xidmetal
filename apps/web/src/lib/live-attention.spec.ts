import { describe, expect, it } from 'vitest';
import { UserRole } from '@xidmetal/shared';
import {
  bookingAttentionGroupKey,
  dashboardBookingsPath,
  dashboardMessagesPath,
  dashboardNotificationsPath,
  dashboardServicesPath,
} from './live-attention';

describe('dashboard attention paths', () => {
  it('xidmət verən və müştəri kabinetinə ayırır', () => {
    expect(dashboardNotificationsPath(UserRole.PROVIDER)).toBe(
      '/dashboard/provider/notifications',
    );
    expect(dashboardNotificationsPath(UserRole.CUSTOMER)).toBe(
      '/dashboard/customer/notifications',
    );
    expect(dashboardMessagesPath(UserRole.CUSTOMER)).toBe('/dashboard/customer/messages');
    expect(dashboardBookingsPath(UserRole.PROVIDER)).toBe('/dashboard/provider/bookings');
    expect(dashboardServicesPath()).toBe('/dashboard/provider/services');
  });
});

describe('bookingAttentionGroupKey', () => {
  it('eyni sifariş nömrəsini bir qrupa yığır', () => {
    expect(
      bookingAttentionGroupKey(
        'Sifariş təsdiqləndi',
        '«Təmizlik» sifarişiniz (XM-26-000421) təsdiqləndi.',
        'n1',
      ),
    ).toBe('booking-XM-26-000421');
    expect(
      bookingAttentionGroupKey(
        'Sifariş tamamlandı',
        '«Təmizlik» sifarişiniz (XM-26-000421) tamamlandı.',
        'n2',
      ),
    ).toBe('booking-XM-26-000421');
  });

  it('fərqli sifariş nömrələrini ayırır', () => {
    expect(
      bookingAttentionGroupKey(
        'Sifariş təsdiqləndi',
        'Sifariş (XM-26-000421)',
        'n1',
      ),
    ).not.toBe(
      bookingAttentionGroupKey(
        'Sifariş təsdiqləndi',
        'Sifariş (XM-26-000422)',
        'n2',
      ),
    );
  });
});
