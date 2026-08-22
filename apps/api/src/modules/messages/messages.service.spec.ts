import { describe, expect, it, vi } from 'vitest';
import { NotificationType, UserRole } from '@xidmetal/shared';
import { MessagesService } from './messages.service';

vi.mock('./typing.store', () => ({
  clearTypingDb: vi.fn().mockResolvedValue(undefined),
  isPeerTypingDb: vi.fn().mockResolvedValue(false),
  setTypingDb: vi.fn().mockResolvedValue(undefined),
}));

describe('MessagesService.sendMessage', () => {
  it('mesajdan sonra message:new + deliverAfterInApp çağırır', async () => {
    const createdAt = new Date('2026-08-10T12:00:00.000Z');
    const prisma = {
      conversation: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'conv-1',
          customerId: 'customer-1',
          providerId: 'provider-1',
        }),
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          message: {
            create: vi.fn().mockResolvedValue({
              id: 'msg-1',
              conversationId: 'conv-1',
              senderId: 'customer-1',
              content: 'Salam',
              imageUrl: null,
              isRead: false,
              readAt: null,
              createdAt,
              sender: { firstName: 'Ali', lastName: 'M' },
            }),
          },
          conversation: {
            update: vi.fn().mockResolvedValue({}),
          },
          notification: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({
              id: 'n-1',
              title: 'Yeni mesaj',
              body: 'Ali: Salam',
            }),
          },
        };
        return fn(tx);
      }),
    };

    const realtime = { emitMessageNew: vi.fn() };
    const notificationChannels = { deliverAfterInApp: vi.fn() };
    const notificationsService = {
      markMessageNotificationsRead: vi.fn(),
    };
    const storageService = {
      toReadableMediaUrl: vi.fn(async (url: string | null) => url),
    };

    const service = new MessagesService(
      prisma as never,
      notificationsService as never,
      storageService as never,
      realtime as never,
      notificationChannels as never,
    );

    const result = await service.sendMessage('conv-1', 'customer-1', {
      content: 'Salam',
    });

    expect(result.id).toBe('msg-1');
    expect(realtime.emitMessageNew).toHaveBeenCalledWith('provider-1', {
      conversationId: 'conv-1',
      messageId: 'msg-1',
      senderId: 'customer-1',
      preview: 'Salam',
      createdAt: createdAt.toISOString(),
    });
    expect(notificationChannels.deliverAfterInApp).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'provider-1',
        notificationId: 'n-1',
        type: NotificationType.MESSAGE_RECEIVED,
      }),
    );
  });

  it('oxunmamış bildiriş varsa yalnız message:new emit edir', async () => {
    const createdAt = new Date('2026-08-10T12:00:00.000Z');
    const prisma = {
      conversation: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'conv-1',
          customerId: 'customer-1',
          providerId: 'provider-1',
        }),
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          message: {
            create: vi.fn().mockResolvedValue({
              id: 'msg-2',
              conversationId: 'conv-1',
              senderId: 'customer-1',
              content: 'Yenə',
              isRead: false,
              readAt: null,
              createdAt,
              sender: { firstName: 'Ali', lastName: 'M' },
            }),
          },
          conversation: {
            update: vi.fn().mockResolvedValue({}),
          },
          notification: {
            findFirst: vi.fn().mockResolvedValue({ id: 'existing' }),
            create: vi.fn(),
          },
        };
        return fn(tx);
      }),
    };

    const realtime = { emitMessageNew: vi.fn() };
    const notificationChannels = { deliverAfterInApp: vi.fn() };

    const service = new MessagesService(
      prisma as never,
      { markMessageNotificationsRead: vi.fn() } as never,
      { toReadableMediaUrl: vi.fn(async (u: string | null) => u) } as never,
      realtime as never,
      notificationChannels as never,
    );

    await service.sendMessage('conv-1', 'customer-1', { content: 'Yenə' });

    expect(realtime.emitMessageNew).toHaveBeenCalled();
    expect(notificationChannels.deliverAfterInApp).not.toHaveBeenCalled();
  });

  it('iştirakçı olmayan istifadəçiyə icazə vermir', async () => {
    const service = new MessagesService(
      {
        conversation: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'conv-1',
            customerId: 'customer-1',
            providerId: 'provider-1',
          }),
        },
      } as never,
      {} as never,
      {} as never,
      { emitMessageNew: vi.fn() } as never,
      { deliverAfterInApp: vi.fn() } as never,
    );

    await expect(
      service.sendMessage('conv-1', 'stranger', { content: 'x' }),
    ).rejects.toThrow('Bu söhbətə giriş icazəniz yoxdur');
  });

  it('provider/customer siyahı filtrini düzgün seçir', async () => {
    const prisma = {
      conversation: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      message: {
        groupBy: vi.fn(),
      },
    };
    const service = new MessagesService(
      prisma as never,
      {} as never,
      {} as never,
      { emitMessageNew: vi.fn() } as never,
      { deliverAfterInApp: vi.fn() } as never,
    );

    await service.findConversations('p-1', UserRole.PROVIDER, 1, 20);
    expect(prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerId: 'p-1', providerDeletedAt: null },
      }),
    );
  });
});
