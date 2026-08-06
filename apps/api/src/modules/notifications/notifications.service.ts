import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotificationType as PrismaNotificationType, Prisma } from '@xidmetal/database';
import {
  ADMIN_NOTIFICATION_TYPES,
  BOOKING_NOTIFICATION_TYPES,
  REVIEW_NOTIFICATION_TYPES,
  MESSAGE_NOTIFICATION_TYPES,
  NotificationType,
} from '@xidmetal/shared';
import type {
  BookingAttentionSummary,
  NotificationSummary,
  UnreadNotificationsSummary,
} from '@xidmetal/shared';
import { PrismaService } from '../../common/database/prisma.service';

/**
 * Shared const massivini Prisma `in` filter üçün nüsxələyir.
 * Köhnə shared dist / modul yüklənmə sırası zamanı undefined olarsa fallback işləyir.
 */
function notificationTypeList(
  types: readonly NotificationType[] | undefined,
  fallback: readonly NotificationType[],
): PrismaNotificationType[] {
  const source = Array.isArray(types) && types.length > 0 ? types : fallback;
  return [...source] as PrismaNotificationType[];
}

const adminTypes = notificationTypeList(ADMIN_NOTIFICATION_TYPES, [
  NotificationType.ADMIN_ANNOUNCEMENT,
]);
const bookingTypes = notificationTypeList(BOOKING_NOTIFICATION_TYPES, [
  NotificationType.BOOKING_CREATED,
  NotificationType.BOOKING_CONFIRMED,
  NotificationType.BOOKING_CANCELLED,
  NotificationType.BOOKING_COMPLETED,
  NotificationType.BOOKING_RESCHEDULE_PROPOSED,
]);
const reviewTypes = notificationTypeList(REVIEW_NOTIFICATION_TYPES, [
  NotificationType.REVIEW_RECEIVED,
]);
const messageTypes = notificationTypeList(MESSAGE_NOTIFICATION_TYPES, [
  NotificationType.MESSAGE_RECEIVED,
]);

/** Zəng panelində göstərilən / deep-link edilə bilən bildirişlər */
const inboxTypes: PrismaNotificationType[] = [
  ...adminTypes,
  ...bookingTypes,
  ...reviewTypes,
  ...messageTypes,
];

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Söhbət oxunanda həmin söhbətə bağlı MESSAGE_RECEIVED bildirişlərini bağlayır.
   */
  async markMessageNotificationsRead(userId: string, conversationId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        type: NotificationType.MESSAGE_RECEIVED,
        isRead: false,
        data: {
          path: ['conversationId'],
          equals: conversationId,
        },
      },
      data: { isRead: true },
    });
    return { markedCount: result.count };
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { userId, type: { in: inboxTypes } };

    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.mapNotification(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Inbox (admin + sifariş + rəy) oxunmamış sayı — zəng ikonu */
  async getUnreadCount(userId: string): Promise<UnreadNotificationsSummary> {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false, type: { in: inboxTypes } },
    });
    return { count };
  }

  /** Sifariş hadisələri — naviqasiya badge-i və səs siqnalı üçün */
  async getBookingAttentionCount(userId: string): Promise<BookingAttentionSummary> {
    const where = { userId, isRead: false, type: { in: bookingTypes } };

    const [count, latest] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findFirst({
        where,
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true },
      }),
    ]);

    return {
      count,
      latestUnreadId: latest?.id ?? null,
      latestUnreadAt: latest?.createdAt.toISOString() ?? null,
    };
  }

  async markBookingNotificationsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false, type: { in: bookingTypes } },
      data: { isRead: true },
    });
    return { markedCount: result.count };
  }

  /** Provider reytinq badge — REVIEW_RECEIVED */
  async getReviewAttentionCount(userId: string): Promise<BookingAttentionSummary> {
    const where = { userId, isRead: false, type: { in: reviewTypes } };

    const [count, latest] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findFirst({
        where,
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true },
      }),
    ]);

    return {
      count,
      latestUnreadId: latest?.id ?? null,
      latestUnreadAt: latest?.createdAt.toISOString() ?? null,
    };
  }

  async markReviewNotificationsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false, type: { in: reviewTypes } },
      data: { isRead: true },
    });
    return { markedCount: result.count };
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException('Bildiriş tapılmadı');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('Bu bildirişə giriş icazəniz yoxdur');
    }

    if (!(inboxTypes as string[]).includes(notification.type)) {
      throw new ForbiddenException('Bu bildirişə giriş icazəniz yoxdur');
    }

    if (notification.isRead) {
      return this.mapNotification(notification);
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return this.mapNotification(updated);
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false, type: { in: inboxTypes } },
      data: { isRead: true },
    });
    return { markedCount: result.count };
  }

  private mapNotification(row: {
    id: string;
    type: string;
    title: string;
    body: string;
    data: Prisma.JsonValue;
    isRead: boolean;
    createdAt: Date;
  }): NotificationSummary {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      data:
        row.data && typeof row.data === 'object' && !Array.isArray(row.data)
          ? (row.data as Record<string, unknown>)
          : null,
      isRead: row.isRead,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
