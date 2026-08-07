import { describe, expect, it } from 'vitest';
import { NotificationType } from '@xidmetal/shared';
import { buildPushFromNotification } from './push-content';

describe('buildPushFromNotification', () => {
  it('title/body və type data yazır', () => {
    const msg = buildPushFromNotification({
      title: 'Sifariş təsdiqləndi',
      body: 'Test',
      type: NotificationType.BOOKING_CONFIRMED,
      data: { bookingId: 'abc' },
    });
    expect(msg.title).toBe('Sifariş təsdiqləndi');
    expect(msg.body).toBe('Test');
    expect(msg.data?.type).toBe(NotificationType.BOOKING_CONFIRMED);
    expect(msg.data?.bookingId).toBe('abc');
  });
});
