import { describe, expect, it, vi } from 'vitest';
import { NotificationType } from '@xidmetal/shared';
import { NotificationChannelsService } from './notification-channels.service';

describe('NotificationChannelsService', () => {
  it('deliverAfterInApp WS notification:new emit edir', () => {
    const push = { sendToUser: vi.fn().mockResolvedValue(undefined) };
    const realtime = {
      emitNotificationNew: vi.fn(),
    };

    const service = new NotificationChannelsService(
      push as never,
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

  it('data.href varsa WS payload-a əlavə edir', () => {
    const push = { sendToUser: vi.fn().mockResolvedValue(undefined) };
    const realtime = {
      emitNotificationNew: vi.fn(),
    };

    const service = new NotificationChannelsService(
      push as never,
      realtime as never,
    );

    service.deliverAfterInApp({
      userId: 'user-1',
      notificationId: 'n-2',
      title: 'Düzəliş',
      body: 'Qeyd',
      type: NotificationType.ADMIN_ANNOUNCEMENT,
      data: { href: '/dashboard/provider/services/s1/edit' },
    });

    expect(realtime.emitNotificationNew).toHaveBeenCalledWith('user-1', {
      id: 'n-2',
      type: NotificationType.ADMIN_ANNOUNCEMENT,
      title: 'Düzəliş',
      body: 'Qeyd',
      href: '/dashboard/provider/services/s1/edit',
    });
  });
});
