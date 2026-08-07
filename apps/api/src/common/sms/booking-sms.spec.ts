import { describe, expect, it } from 'vitest';
import { NotificationType } from '@xidmetal/shared';
import { buildBookingSmsContent, isSmsStatusEvent } from './booking-sms';

describe('booking-sms', () => {
  it('kritik statuslar üçün AZ mətn qaytarır', () => {
    const content = buildBookingSmsContent({
      event: NotificationType.BOOKING_CONFIRMED,
      serviceTitle: 'Təmizlik',
      scheduledAtLabel: '1 yanvar',
    });
    expect(content?.body).toContain('Təmizlik');
    expect(content?.body).toContain('təsdiqləndi');
  });

  it('SMS siyahısında olmayan tip üçün null', () => {
    expect(
      buildBookingSmsContent({
        event: NotificationType.BOOKING_IN_PROGRESS,
        serviceTitle: 'X',
      }),
    ).toBeNull();
  });

  it('isSmsStatusEvent allowlist yoxlayır', () => {
    expect(isSmsStatusEvent(NotificationType.BOOKING_EN_ROUTE)).toBe(true);
    expect(isSmsStatusEvent(NotificationType.MESSAGE_RECEIVED)).toBe(false);
  });
});
