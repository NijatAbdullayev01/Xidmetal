import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@xidmetal/database';
import { NotificationType } from '@xidmetal/shared';
import { PrismaService } from '../../common/database/prisma.service';
import type { NotificationSummary, UnreadNotificationsSummary } from '@xidmetal/shared';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Söhbət oxunanda həmin söhbətə bağlı MESSAGE_RECEIVED bildirişlərini bağlayır.
   * Mesaj unread ilə zəng bildirişi ayrı sistemlərdə qalmaması üçün.
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

    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      items: rows.map((row) => this.mapNotification(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(userId: string): Promise<UnreadNotificationsSummary> {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException('Bildiriş tapılmadı');
    }
    if (notification.userId !== userId) {
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
      where: { userId, isRead: false },
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
