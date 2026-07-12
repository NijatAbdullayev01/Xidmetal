import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateConversationDto, SendMessageDto } from './dto';
import { UserRole } from '@xidmetal/shared';
import type { ConversationDetail, ConversationSummary, MessageSummary } from '@xidmetal/shared';

type ConversationWithRelations = {
  id: string;
  customerId: string;
  providerId: string;
  bookingId: string | null;
  updatedAt: Date;
  customer: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  provider: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  booking: { service: { title: string } } | null;
  messages: Array<{
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    isRead: boolean;
    createdAt: Date;
    sender: { firstName: string; lastName: string };
  }>;
};

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async findConversations(userId: string, role: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where =
      role === UserRole.PROVIDER
        ? { providerId: userId }
        : role === UserRole.ADMIN
          ? {}
          : { customerId: userId };

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          provider: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          booking: { select: { service: { select: { title: true } } } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { sender: { select: { firstName: true, lastName: true } } },
          },
        },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    const items = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            isRead: false,
            NOT: { senderId: userId },
          },
        });
        return this.mapConversation(conv, unreadCount);
      }),
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findConversation(id: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        provider: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        booking: { select: { service: { select: { title: true } } } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Söhbət tapılmadı');
    }

    this.assertParticipant(conversation, userId);

    await this.prisma.message.updateMany({
      where: {
        conversationId: id,
        isRead: false,
        NOT: { senderId: userId },
      },
      data: { isRead: true },
    });

    const unreadCount = 0;
    const summary = this.mapConversation(conversation, unreadCount);
    const detail: ConversationDetail = {
      ...summary,
      messages: conversation.messages.map((m) => this.mapMessage(m)),
    };

    return detail;
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
      if (booking.customerId !== userId && booking.providerId !== userId) {
        throw new ForbiddenException('Bu sifarişə giriş icazəniz yoxdur');
      }
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

    const existing = await this.prisma.conversation.findUnique({
      where: { customerId_providerId: { customerId, providerId } },
    });

    if (existing) {
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
        ...(dto.initialMessage && {
          messages: {
            create: {
              senderId: userId,
              content: dto.initialMessage,
            },
          },
        }),
      },
    });

    return this.findConversation(conversation.id, userId);
  }

  async sendMessage(conversationId: string, userId: string, dto: SendMessageDto) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Söhbət tapılmadı');
    }

    this.assertParticipant(conversation, userId);

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          content: dto.content.trim(),
        },
        include: { sender: { select: { firstName: true, lastName: true } } },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return created;
    });

    return this.mapMessage(message);
  }

  private assertParticipant(
    conversation: { customerId: string; providerId: string },
    userId: string,
  ) {
    if (conversation.customerId !== userId && conversation.providerId !== userId) {
      throw new ForbiddenException('Bu söhbətə giriş icazəniz yoxdur');
    }
  }

  private mapMessage(message: ConversationWithRelations['messages'][number]): MessageSummary {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: `${message.sender.firstName} ${message.sender.lastName}`,
      content: message.content,
      isRead: message.isRead,
      createdAt: message.createdAt.toISOString(),
    };
  }

  private mapConversation(
    conv: Omit<ConversationWithRelations, 'messages'> & {
      messages?: ConversationWithRelations['messages'];
    },
    unreadCount: number,
  ): ConversationSummary {
    const lastMsg = conv.messages?.[0];
    return {
      id: conv.id,
      customerId: conv.customerId,
      customerName: `${conv.customer.firstName} ${conv.customer.lastName}`,
      customerAvatarUrl: conv.customer.avatarUrl ?? undefined,
      providerId: conv.providerId,
      providerName: `${conv.provider.firstName} ${conv.provider.lastName}`,
      providerAvatarUrl: conv.provider.avatarUrl ?? undefined,
      bookingId: conv.bookingId ?? undefined,
      serviceTitle: conv.booking?.service.title,
      lastMessage: lastMsg?.content,
      lastMessageAt: lastMsg?.createdAt.toISOString(),
      unreadCount,
      updatedAt: conv.updatedAt.toISOString(),
    };
  }
}
