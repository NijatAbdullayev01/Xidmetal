import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { NotificationChannelsService } from '../../common/notifications/notification-channels.service';
import { StorageService } from '../../common/storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateConversationDto, SendMessageDto } from './dto';
import { clearTypingDb, isPeerTypingDb, setTypingDb } from './typing.store';
import {
  UserRole,
  NotificationType,
  BookingStatus,
  bookingMessagingBlockedMessage,
  isBookingMessagingEnabled,
} from '@xidmetal/shared';
import { isBookingParticipant } from '../bookings/booking-access';
import type {
  ConversationDetail,
  ConversationSummary,
  MessageSummary,
  PeerPresence,
  UnreadMessagesSummary,
} from '@xidmetal/shared';

const DEFAULT_MESSAGE_PAGE_SIZE = 50;
/** Qarşı tərəf bu müddətdə heartbeat göndəribsə onlayn sayılır */
const ONLINE_THRESHOLD_MS = 90_000;

type ConversationWithRelations = {
  id: string;
  customerId: string;
  providerId: string;
  bookingId: string | null;
  customerDeletedAt: Date | null;
  providerDeletedAt: Date | null;
  updatedAt: Date;
  customer: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  provider: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  booking: { status: string; service: { title: string } } | null;
  messages: Array<{
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    imageUrl: string | null;
    isRead: boolean;
    readAt: Date | null;
    createdAt: Date;
    sender: { firstName: string; lastName: string };
  }>;
};

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private storageService: StorageService,
    private realtime: RealtimeService,
    private notificationChannels: NotificationChannelsService,
  ) {}

  private conversationWhereForUser(userId: string, role: string) {
    if (role === UserRole.PROVIDER) return { providerId: userId };
    if (role === UserRole.CUSTOMER) return { customerId: userId };
    throw new ForbiddenException('Bu əməliyyat üçün icazəniz yoxdur');
  }

  /** İstifadəçinin öz siyahısından silmədiyi söhbətlər */
  private visibleConversationWhere(userId: string, role: string) {
    const base = this.conversationWhereForUser(userId, role);
    if (role === UserRole.PROVIDER) {
      return { ...base, providerDeletedAt: null };
    }
    return { ...base, customerDeletedAt: null };
  }

  private deletedAtFieldForUser(
    conversation: { customerId: string; providerId: string },
    userId: string,
  ): 'customerDeletedAt' | 'providerDeletedAt' {
    if (conversation.customerId === userId) return 'customerDeletedAt';
    if (conversation.providerId === userId) return 'providerDeletedAt';
    throw new NotFoundException('Söhbət tapılmadı');
  }

  private isHiddenForUser(
    conversation: {
      customerId: string;
      providerId: string;
      customerDeletedAt: Date | null;
      providerDeletedAt: Date | null;
    },
    userId: string,
  ): boolean {
    if (conversation.customerId === userId) return conversation.customerDeletedAt !== null;
    if (conversation.providerId === userId) return conversation.providerDeletedAt !== null;
    return true;
  }

  async getUnreadSummary(userId: string, role: string): Promise<UnreadMessagesSummary> {
    const conversationWhere = this.visibleConversationWhere(userId, role);
    const unreadWhere = {
      isRead: false,
      NOT: { senderId: userId },
      conversation: conversationWhere,
    };

    const [count, latest] = await Promise.all([
      this.prisma.message.count({ where: unreadWhere }),
      this.prisma.message.findFirst({
        where: unreadWhere,
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true },
      }),
    ]);

    return {
      count,
      latestUnreadMessageId: latest?.id ?? null,
      latestUnreadAt: latest?.createdAt.toISOString() ?? null,
    };
  }

  async findConversations(userId: string, role: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = this.visibleConversationWhere(userId, role);

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          provider: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          booking: { select: { status: true, service: { select: { title: true } } } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { sender: { select: { firstName: true, lastName: true } } },
          },
        },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    const conversationIds = conversations.map((c) => c.id);
    const unreadCounts = new Map<string, number>();

    if (conversationIds.length > 0) {
      const grouped = await this.prisma.message.groupBy({
        by: ['conversationId'],
        where: {
          conversationId: { in: conversationIds },
          isRead: false,
          NOT: { senderId: userId },
        },
        _count: { _all: true },
      });
      for (const row of grouped) {
        unreadCounts.set(row.conversationId, row._count._all);
      }
    }

    const items = await Promise.all(
      conversations.map((conv) =>
        this.mapConversation(conv, unreadCounts.get(conv.id) ?? 0, 'desc'),
      ),
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findConversation(id: string, userId: string): Promise<ConversationDetail> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        provider: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        booking: { select: { status: true, service: { select: { title: true } } } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Söhbət tapılmadı');
    }

    this.assertParticipant(conversation, userId);

    if (this.isHiddenForUser(conversation, userId)) {
      throw new NotFoundException('Söhbət tapılmadı');
    }

    const peerId =
      conversation.customerId === userId
        ? conversation.providerId
        : conversation.customerId;

    const limit = DEFAULT_MESSAGE_PAGE_SIZE;
    const [recent, peer, unreadCount] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        include: { sender: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.user.findUnique({
        where: { id: peerId },
        select: { lastSeenAt: true },
      }),
      this.prisma.message.count({
        where: {
          conversationId: id,
          isRead: false,
          NOT: { senderId: userId },
        },
      }),
    ]);

    const hasMore = recent.length > limit;
    const page = hasMore ? recent.slice(0, limit) : recent;
    const messagesAsc = [...page].reverse();
    const nextCursor = hasMore ? messagesAsc[0]?.id ?? null : null;

    const withMessages: ConversationWithRelations = {
      ...conversation,
      messages: messagesAsc,
    };

    const summary = await this.mapConversation(withMessages, unreadCount, 'asc');
    return {
      ...summary,
      messages: await Promise.all(messagesAsc.map((m) => this.mapMessage(m))),
      nextCursor,
      hasMore,
      peerPresence: this.mapPeerPresence(peer?.lastSeenAt ?? null),
      peerTyping: await isPeerTypingDb(this.prisma, id, userId),
    };
  }

  async findMessages(
    conversationId: string,
    userId: string,
    before?: string,
    limit = DEFAULT_MESSAGE_PAGE_SIZE,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        customerId: true,
        providerId: true,
        customerDeletedAt: true,
        providerDeletedAt: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Söhbət tapılmadı');
    }

    this.assertParticipant(conversation, userId);

    if (this.isHiddenForUser(conversation, userId)) {
      throw new NotFoundException('Söhbət tapılmadı');
    }

    let beforeFilter: { createdAt: { lt: Date } } | undefined;
    if (before) {
      const cursorMessage = await this.prisma.message.findFirst({
        where: { id: before, conversationId },
        select: { createdAt: true },
      });
      if (!cursorMessage) {
        throw new BadRequestException('Cursor mesajı tapılmadı');
      }
      beforeFilter = { createdAt: { lt: cursorMessage.createdAt } };
    }

    const rows = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...beforeFilter,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: { sender: { select: { firstName: true, lastName: true } } },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const messagesAsc = [...page].reverse();
    const nextCursor = hasMore ? messagesAsc[0]?.id ?? null : null;

    return {
      items: await Promise.all(messagesAsc.map((m) => this.mapMessage(m))),
      nextCursor,
      hasMore,
    };
  }

  async markConversationRead(id: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      select: {
        id: true,
        customerId: true,
        providerId: true,
        customerDeletedAt: true,
        providerDeletedAt: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Söhbət tapılmadı');
    }

    this.assertParticipant(conversation, userId);

    if (this.isHiddenForUser(conversation, userId)) {
      throw new NotFoundException('Söhbət tapılmadı');
    }

    const now = new Date();
    const result = await this.prisma.message.updateMany({
      where: {
        conversationId: id,
        isRead: false,
        NOT: { senderId: userId },
      },
      data: { isRead: true, readAt: now },
    });

    // Mesaj oxunanda eyni söhbətin zəng bildirişi də bağlanmalıdır
    await this.notificationsService.markMessageNotificationsRead(userId, id);

    return { markedCount: result.count };
  }

  async setTyping(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        customerId: true,
        providerId: true,
        customerDeletedAt: true,
        providerDeletedAt: true,
        booking: { select: { status: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Söhbət tapılmadı');
    }

    this.assertParticipant(conversation, userId);

    if (this.isHiddenForUser(conversation, userId)) {
      throw new NotFoundException('Söhbət tapılmadı');
    }

    this.assertBookingAllowsMessaging(conversation.booking);

    await setTypingDb(this.prisma, conversationId, userId);
    return { ok: true as const };
  }

  /**
   * Söhbəti yalnız cari istifadəçinin siyahısından gizlədir (hard-delete yox).
   * Mesajlar DB-də qalır; qarşı tərəfə yeni mesaj gələndə söhbət yenidən açılır.
   */
  async deleteConversation(id: string, userId: string, role: string) {
    this.conversationWhereForUser(userId, role);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      select: {
        id: true,
        customerId: true,
        providerId: true,
        customerDeletedAt: true,
        providerDeletedAt: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Söhbət tapılmadı');
    }

    this.assertParticipant(conversation, userId);

    if (this.isHiddenForUser(conversation, userId)) {
      return { ok: true as const };
    }

    const deletedField = this.deletedAtFieldForUser(conversation, userId);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.message.updateMany({
        where: {
          conversationId: id,
          isRead: false,
          NOT: { senderId: userId },
        },
        data: { isRead: true, readAt: now },
      });

      await tx.conversation.update({
        where: { id },
        data: { [deletedField]: now },
      });
    });

    await this.notificationsService.markMessageNotificationsRead(userId, id);
    await clearTypingDb(this.prisma, id, userId);

    return { ok: true as const };
  }

  async createConversation(userId: string, role: string, dto: CreateConversationDto) {
    let customerId: string;
    let providerId: string;
    let bookingId: string | undefined;

    if (dto.bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: dto.bookingId },
      });
      if (!booking) {
        throw new NotFoundException('Sifariş tapılmadı');
      }
      if (!isBookingParticipant(userId, role, booking)) {
        throw new NotFoundException('Sifariş tapılmadı');
      }
      this.assertBookingAllowsMessaging(booking);
      customerId = booking.customerId;
      providerId = booking.providerId;
      bookingId = booking.id;
    } else if (role === UserRole.CUSTOMER) {
      if (!dto.providerId) {
        throw new BadRequestException('Xidmət verən seçilməlidir');
      }
      customerId = userId;
      providerId = dto.providerId;
    } else if (role === UserRole.PROVIDER) {
      if (!dto.customerId) {
        throw new BadRequestException('Müştəri seçilməlidir');
      }
      customerId = dto.customerId;
      providerId = userId;
    } else {
      throw new BadRequestException('Söhbət yaratmaq üçün müştəri və ya xidmət verən göstərin');
    }

    if (customerId === providerId) {
      throw new BadRequestException('Özünüzlə söhbət edə bilməzsiniz');
    }

    const provider = await this.prisma.user.findUnique({ where: { id: providerId } });
    if (!provider || provider.role !== UserRole.PROVIDER) {
      throw new BadRequestException('Xidmət verən tapılmadı');
    }

    if (!dto.bookingId) {
      const priorBooking = await this.prisma.booking.findFirst({
        where: { customerId, providerId },
        select: { id: true },
      });
      if (!priorBooking) {
        throw new ForbiddenException(
          'Söhbət yalnız mövcud sifariş əlaqəsi olan tərəflər arasında açıla bilər',
        );
      }
    }

    const existing = await this.prisma.conversation.findUnique({
      where: { customerId_providerId: { customerId, providerId } },
    });

    if (existing) {
      const restoreField = this.deletedAtFieldForUser(existing, userId);
      const needsBookingUpdate = Boolean(bookingId && existing.bookingId !== bookingId);
      const needsRestore =
        (restoreField === 'customerDeletedAt' && existing.customerDeletedAt !== null) ||
        (restoreField === 'providerDeletedAt' && existing.providerDeletedAt !== null);

      if (needsBookingUpdate || needsRestore) {
        await this.prisma.conversation.update({
          where: { id: existing.id },
          data: {
            ...(needsBookingUpdate ? { bookingId } : {}),
            ...(needsRestore ? { [restoreField]: null } : {}),
          },
        });
      }
      if (dto.initialMessage) {
        await this.sendMessage(existing.id, userId, { content: dto.initialMessage });
      }
      return this.findConversation(existing.id, userId);
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        customerId,
        providerId,
        bookingId,
      },
    });

    if (dto.initialMessage) {
      await this.sendMessage(conversation.id, userId, { content: dto.initialMessage });
    }

    return this.findConversation(conversation.id, userId);
  }

  async sendMessage(conversationId: string, userId: string, dto: SendMessageDto) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { booking: { select: { status: true } } },
    });

    if (!conversation) {
      throw new NotFoundException('Söhbət tapılmadı');
    }

    this.assertParticipant(conversation, userId);
    this.assertBookingAllowsMessaging(conversation.booking);

    const content = dto.content?.trim() ?? '';
    let imageUrl: string | null = null;
    if (dto.imageUrl?.trim()) {
      imageUrl = await this.storageService.assertOwnedUploadUrl(
        dto.imageUrl.trim(),
        'messages',
        userId,
      );
    }
    if (!content && !imageUrl) {
      throw new BadRequestException('Mesaj və ya şəkil lazımdır');
    }
    const storedContent = content || '[Şəkil]';

    await clearTypingDb(this.prisma, conversationId, userId);

    const recipientId =
      conversation.customerId === userId
        ? conversation.providerId
        : conversation.customerId;

    const previewSource = content || 'Şəkil';
    const preview = previewSource.length > 80 ? `${previewSource.slice(0, 80)}…` : previewSource;

    const { message, notification } = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          content: storedContent,
          imageUrl,
        },
        include: { sender: { select: { firstName: true, lastName: true } } },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          updatedAt: new Date(),
          customerDeletedAt: null,
          providerDeletedAt: null,
        },
      });

      // Eyni söhbət üçün oxunmamış MESSAGE_RECEIVED varsa təkrar yazma (spam yox)
      const existingUnread = await tx.notification.findFirst({
        where: {
          userId: recipientId,
          type: NotificationType.MESSAGE_RECEIVED,
          isRead: false,
          data: { path: ['conversationId'], equals: conversationId },
        },
        select: { id: true },
      });

      let createdNotification: {
        id: string;
        title: string;
        body: string;
      } | null = null;

      if (!existingUnread) {
        createdNotification = await tx.notification.create({
          data: {
            userId: recipientId,
            type: NotificationType.MESSAGE_RECEIVED,
            title: 'Yeni mesaj',
            body: `${created.sender.firstName}: ${preview}`,
            data: { conversationId, messageId: created.id },
          },
          select: { id: true, title: true, body: true },
        });
      }

      return { message: created, notification: createdNotification };
    });

    // Best-effort: canlı chat + (yeni in-app olduqda) push/WS notification
    this.realtime.emitMessageNew(recipientId, {
      conversationId,
      messageId: message.id,
      senderId: userId,
      preview,
      createdAt: message.createdAt.toISOString(),
    });

    if (notification) {
      this.notificationChannels.deliverAfterInApp({
        userId: recipientId,
        notificationId: notification.id,
        title: notification.title,
        body: notification.body,
        type: NotificationType.MESSAGE_RECEIVED,
        data: { conversationId, messageId: message.id },
      });
    }

    return this.mapMessage(message);
  }

  private assertParticipant(
    conversation: { customerId: string; providerId: string },
    userId: string,
  ) {
    if (conversation.customerId !== userId && conversation.providerId !== userId) {
      throw new NotFoundException('Söhbət tapılmadı');
    }
  }

  private assertBookingAllowsMessaging(booking: { status: string } | null | undefined) {
    if (!booking) return;
    if (!isBookingMessagingEnabled(booking.status)) {
      throw new BadRequestException(bookingMessagingBlockedMessage(booking.status));
    }
  }

  private mapPeerPresence(lastSeenAt: Date | null): PeerPresence {
    if (!lastSeenAt) {
      return { isOnline: false, lastSeenAt: null };
    }
    const isOnline = Date.now() - lastSeenAt.getTime() < ONLINE_THRESHOLD_MS;
    return {
      isOnline,
      lastSeenAt: lastSeenAt.toISOString(),
    };
  }

  private async mapMessage(message: ConversationWithRelations['messages'][number]): Promise<MessageSummary> {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: `${message.sender.firstName} ${message.sender.lastName}`,
      content: message.content,
      imageUrl: message.imageUrl
        ? ((await this.storageService.toReadableMediaUrl(message.imageUrl)) ?? message.imageUrl)
        : null,
      isRead: message.isRead,
      readAt: message.readAt?.toISOString() ?? null,
      createdAt: message.createdAt.toISOString(),
    };
  }

  private async mapConversation(
    conv: Omit<ConversationWithRelations, 'messages'> & {
      messages?: ConversationWithRelations['messages'];
    },
    unreadCount: number,
    messageOrder: 'asc' | 'desc',
  ): Promise<ConversationSummary> {
    const messages = conv.messages ?? [];
    const lastMsg =
      messageOrder === 'desc' ? messages[0] : messages.length > 0 ? messages[messages.length - 1] : undefined;
    return {
      id: conv.id,
      customerId: conv.customerId,
      customerName: `${conv.customer.firstName} ${conv.customer.lastName}`,
      customerAvatarUrl: await this.storageService.toReadableMediaUrl(conv.customer.avatarUrl),
      providerId: conv.providerId,
      providerName: `${conv.provider.firstName} ${conv.provider.lastName}`,
      providerAvatarUrl: await this.storageService.toReadableMediaUrl(conv.provider.avatarUrl),
      bookingId: conv.bookingId ?? undefined,
      bookingStatus: conv.booking?.status as BookingStatus | undefined,
      serviceTitle: conv.booking?.service.title,
      lastMessage: lastMsg?.imageUrl && lastMsg.content === '[Şəkil]' ? 'Şəkil' : lastMsg?.content,
      lastMessageAt: lastMsg?.createdAt.toISOString(),
      unreadCount,
      updatedAt: conv.updatedAt.toISOString(),
    };
  }
}
