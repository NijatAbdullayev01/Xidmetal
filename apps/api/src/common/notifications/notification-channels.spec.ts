import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { NotificationType } from '@xidmetal/shared';
import { NotificationChannelsService } from './notification-channels.service';

describe('NotificationChannelsService', () => {
  it('deliverAfterInApp WS notification:new emit edir', () => {
    const push = { sendToUser: vi.fn().mockResolvedValue(undefined) };
    const sms = { send: vi.fn().mockResolvedValue(undefined) };
    const config = {
      get: vi.fn().mockReturnValue('false'),
    } as unknown as ConfigService;
    const realtime = {
      emitNotificationNew: vi.fn(),
    };

    const service = new NotificationChannelsService(
      push as never,
      sms as never,
      config,
      realtime as never,
    );

    service.deliverAfterInApp({
      userId: 'user-1',
      notificationId: 'n-1',
      title: 'Test',
      body: 'Mesaj',
      type: NotificationType.ADMIN_ANNOUNCEMENT,
    });

    expect(realtime.emitNotificationNew).toHaveBeenCalledWith('user-1', {
      id: 'n-1',
      type: NotificationType.ADMIN_ANNOUNCEMENT,
      title: 'Test',
      body: 'Mesaj',
    });
    expect(push.sendToUser).toHaveBeenCalled();
  });

  it('təsdiqlənməmiş telefona SMS göndərmir', async () => {
    const push = { sendToUser: vi.fn().mockResolvedValue(undefined) };
    const sms = { send: vi.fn().mockResolvedValue(undefined) };
    const config = {
      get: (key: string) =>
        key === 'SMS_STATUS_ENABLED' ? 'true' : undefined,
    } as unknown as ConfigService;

    const service = new NotificationChannelsService(
      push as never,
      sms as never,
      config,
    );

    service.deliverAfterInApp({
      userId: 'user-1',
      title: 'Ləğv',
      body: '…',
      type: NotificationType.BOOKING_CANCELLED,
      phone: '+994501234567',
      phoneVerifiedAt: null,
      serviceTitle: 'Təmir',
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(sms.send).not.toHaveBeenCalled();
  });
});
