import { describe, expect, it, vi } from 'vitest';
import { BookingStatus, REALTIME_EVENTS } from '@xidmetal/shared';
import { RealtimeService } from './realtime.service';

describe('RealtimeService', () => {
  it('emitBookingStatus booking və iştirakçı user otaqlarına göndərir', () => {
    const service = new RealtimeService();
    const emit = vi.fn();
    const to = vi.fn(() => ({ emit }));
    service.setServer({ to } as never);

    service.emitBookingStatus(
      {
        bookingId: 'b1',
        status: BookingStatus.EN_ROUTE,
        timestamp: '2026-08-10T12:00:00.000Z',
      },
      ['customer-1', 'provider-1', 'customer-1'],
    );

    expect(to).toHaveBeenCalledWith('booking:b1');
    expect(to).toHaveBeenCalledWith('user:customer-1');
    expect(to).toHaveBeenCalledWith('user:provider-1');
    expect(emit).toHaveBeenCalledTimes(3);
    expect(emit).toHaveBeenCalledWith(
      REALTIME_EVENTS.BOOKING_STATUS,
      expect.objectContaining({ bookingId: 'b1', status: BookingStatus.EN_ROUTE }),
    );
  });

  it('emitMessageNew user otağına MESSAGE_NEW göndərir', () => {
    const service = new RealtimeService();
    const emit = vi.fn();
    const to = vi.fn(() => ({ emit }));
    service.setServer({ to } as never);

    service.emitMessageNew('user-9', {
      conversationId: 'c1',
      messageId: 'm1',
      senderId: 'u1',
      preview: 'Salam',
      createdAt: '2026-08-10T12:00:00.000Z',
    });

    expect(to).toHaveBeenCalledWith('user:user-9');
    expect(emit).toHaveBeenCalledWith(
      REALTIME_EVENTS.MESSAGE_NEW,
      expect.objectContaining({ messageId: 'm1' }),
    );
  });

  it('server yoxdursa emit etmir (fail-soft)', () => {
    const service = new RealtimeService();
    expect(() =>
      service.emitNotificationNew('u1', {
        id: 'n1',
        type: 'X',
        title: 't',
        body: 'b',
      }),
    ).not.toThrow();
  });
});
