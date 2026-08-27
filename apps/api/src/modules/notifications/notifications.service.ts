import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotificationType as PrismaNotificationType, Prisma } from '@xidmetal/database';
import {
  ADMIN_NOTIFICATION_TYPES,
  BOOKING_NOTIFICATION_TYPES,
  REVIEW_NOTIFICATION_TYPES,
  SERVICE_NOTIFICATION_TYPES,
  NotificationType,
  isServiceReviewNotification,
} from '@xidmetal/shared';
import type {
  BookingAttentionSummary,
  NotificationSummary,
  ServiceAttentionSummary,
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

function jsonRecord(data: Prisma.JsonValue): Record<string, unknown> | null {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return null;
}

const adminTypes = notificationTypeList(ADMIN_NOTIFICATION_TYPES, [
  NotificationType.ADMIN_ANNOUNCEMENT,
]);
const bookingTypes = notificationTypeList(BOOKING_NOTIFICATION_TYPES, [
  NotificationType.BOOKING_CREATED,
  NotificationType.BOOKING_CONFIRMED,
  NotificationType.BOOKING_CANCELLED,
  NotificationType.BOOKING_REJECTED,
  NotificationType.BOOKING_COMPLETED,
  NotificationType.BOOKING_IN_PROGRESS,
  NotificationType.BOOKING_EN_ROUTE,
  NotificationType.BOOKING_ARRIVED,
  NotificationType.BOOKING_RESCHEDULE_PROPOSED,
  NotificationType.BOOKING_RESCHEDULE_REJECTED,
]);
const reviewTypes = notificationTypeList(REVIEW_NOTIFICATION_TYPES, [
  NotificationType.REVIEW_RECEIVED,
]);
const serviceTypes = notificationTypeList(SERVICE_NOTIFICATION_TYPES, [
  NotificationType.SERVICE_APPROVED,
  NotificationType.SERVICE_NEEDS_REVISION,
]);

/**
 * Zəng / Bildirişlər səhifəsi — yalnız admin/platforma elanları.
 * Sifariş → booking badge; mesaj → söhbət; rəy → review badge;
 * xidmət yoxlaması → Xidmətlərim.
 * Qayda: `.cursor/rules/notifications.mdc`
 */
const inboxTypes: PrismaNotificationType[] = [...adminTypes];

/** Köhnə ADMIN_ANNOUNCEMENT xidmət yoxlaması (migration-dan əvvəl). */
const legacyServiceReviewOr: Prisma.NotificationWhereInput[] = [
  { data: { path: ['serviceNeedsRevision'], equals: true } },
  { data: { path: ['serviceApproved'], equals: true } },
];

function inboxWhere(userId: string, unreadOnly = false): Prisma.NotificationWhereInput {
  return {
    userId,
    type: { in: inboxTypes },
    ...(unreadOnly ? { isRead: false } : {}),
    NOT: { OR: legacyServiceReviewOr },
  };
}

function serviceReviewWhere(userId: string, unreadOnly = false): Prisma.NotificationWhereInput {
  return {
    userId,
    ...(unreadOnly ? { isRead: false } : {}),
    OR: [
      { type: { in: serviceTypes } },
      { type: NotificationType.ADMIN_ANNOUNCEMENT, OR: legacyServiceReviewOr },
    ],
  };
}

function serviceApprovedWhere(userId: string): Prisma.NotificationWhereInput {
  return {
    userId,
    isRead: false,
    OR: [
      { type: NotificationType.SERVICE_APPROVED },
      {
        type: NotificationType.ADMIN_ANNOUNCEMENT,
        data: { path: ['serviceApproved'], equals: true },
      },
    ],
  };
}

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

  /** Yalnız admin/platforma bildirişləri (sifariş/mesaj/rəy/xidmət yoxlaması daxil deyil) */
  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = inboxWhere(userId);

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

  private async attentionSummaryForWhere(
    where: Prisma.NotificationWhereInput,
  ): Promise<BookingAttentionSummary> {
    const [count, latest] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findFirst({
        where,
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true, title: true, type: true, body: true },
      }),
    ]);
    return {
      count,
      latestUnreadId: latest?.id ?? null,
      latestUnreadAt: latest?.createdAt.toISOString() ?? null,
      latestTitle: latest?.title ?? null,
      latestType: latest?.type ?? null,
      latestBody: latest?.body ?? null,
    };
  }

  private async attentionSummary(
    userId: string,
    types: PrismaNotificationType[],
  ): Promise<BookingAttentionSummary> {
    return this.attentionSummaryForWhere({ userId, isRead: false, type: { in: types } });
  }

  /** Admin/platforma oxunmamış sayı — zəng ikonu + səs + tab mövzusu */
  async getUnreadCount(userId: string): Promise<UnreadNotificationsSummary> {
    return this.attentionSummaryForWhere(inboxWhere(userId, true));
  }

  /** Sifariş hadisələri — naviqasiya badge-i, səs və tab mövzusu */
  async getBookingAttentionCount(userId: string): Promise<BookingAttentionSummary> {
    return this.attentionSummary(userId, bookingTypes);
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
    return this.attentionSummary(userId, reviewTypes);
  }

  async markReviewNotificationsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false, type: { in: reviewTypes } },
      data: { isRead: true },
    });
    return { markedCount: result.count };
  }

  /** Xidmətlərim — təsdiq / düzəliş (inbox-a düşmür) */
  async getServiceAttentionCount(userId: string): Promise<ServiceAttentionSummary> {
    const [summary, approvedCount] = await Promise.all([
      this.attentionSummaryForWhere(serviceReviewWhere(userId, true)),
      this.prisma.notification.count({ where: serviceApprovedWhere(userId) }),
    ]);
    return { ...summary, approvedCount };
  }

  async markServiceNotificationsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: serviceReviewWhere(userId, true),
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

    const data = jsonRecord(notification.data);
    if (
      !(inboxTypes as string[]).includes(notification.type) ||
      isServiceReviewNotification(notification.type, data)
    ) {
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
      where: inboxWhere(userId, true),
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
      data: jsonRecord(row.data),
      isRead: row.isRead,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
