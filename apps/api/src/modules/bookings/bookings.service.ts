import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { CreateBookingDto, RescheduleBookingDto, UpdateBookingStatusDto } from './dto';
import { UserRole, BookingStatus, NotificationType } from '@xidmetal/shared';
import { ServiceStatus } from '@prisma/client';
import { AvailabilityService } from '../availability/availability.service';

const bookingSummaryInclude = {
  service: { select: { id: true, title: true } },
  customer: { select: { id: true, firstName: true, lastName: true } },
  provider: { select: { id: true, firstName: true, lastName: true } },
  review: { select: { id: true } },
} as const;

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private availabilityService: AvailabilityService,
    private storageService: StorageService,
  ) {}

  async findById(id: string, userId: string, role: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: bookingSummaryInclude,
    });
    if (!booking) {
      throw new NotFoundException('Sifariş tapılmadı');
    }

    const isParticipant =
      booking.customerId === userId || booking.providerId === userId;
    if (role !== UserRole.ADMIN && !isParticipant) {
      throw new ForbiddenException('Bu sifarişə baxmaq icazəniz yoxdur');
    }

    return this.mapBooking(booking);
  }

  async findAll(
    userId: string,
    role: string,
    page = 1,
    limit = 20,
    status?: BookingStatus,
    statuses?: BookingStatus[],
  ) {
    const skip = (page - 1) * limit;
    const statusFilter =
      statuses && statuses.length > 0
        ? { status: { in: statuses } }
        : status
          ? { status }
          : {};

    const where = {
      // PROVIDER hesabı eyni zamanda başqa provider-in xidmətinə sifariş verə
      // bildiyi üçün həm `providerId`, həm də `customerId` üzrə uyğunluğa baxılır.
      ...(role === UserRole.PROVIDER
        ? { OR: [{ providerId: userId }, { customerId: userId }] }
        : role === UserRole.ADMIN
          ? {}
          : { customerId: userId }),
      ...statusFilter,
    };

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: bookingSummaryInclude,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items: items.map((b: (typeof items)[number]) => this.mapBooking(b)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(customerId: string, dto: CreateBookingDto) {
    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      throw new BadRequestException('Sifariş tarixi gələcəkdə olmalıdır');
    }

    if (dto.imageUrl) {
      this.storageService.assertAllowedMediaUrl(dto.imageUrl);
    }

    const booking = await this.prisma.$transaction(async (tx) => {
      const service = await tx.service.findUnique({
        where: { id: dto.serviceId },
        include: {
          category: { select: { isActive: true } },
          provider: {
            select: {
              providerProfile: { select: { isVerified: true } },
            },
          },
        },
      });

      if (!service || service.status !== ServiceStatus.ACTIVE || !service.category.isActive) {
        throw new NotFoundException('Xidmət tapılmadı və ya aktiv deyil');
      }

      if (!service.provider.providerProfile?.isVerified) {
        throw new BadRequestException('Bu xidmət verən hələ təsdiqlənməyib');
      }

      if (service.providerId === customerId) {
        throw new BadRequestException('Öz xidmətinizə sifariş verə bilməzsiniz');
      }

      const notes = dto.notes?.trim();
      if (!notes) {
        throw new BadRequestException('Qeyd yazın');
      }

      const address = dto.address?.trim();
      if (!service.isRemote && !address) {
        throw new BadRequestException('Ünvan daxil edin');
      }

      // Provider üzrə seriyalaşdırma + slot re-check (TOCTOU race-i bağlayır)
      await this.availabilityService.lockProviderBookings(tx, service.providerId);
      await this.availabilityService.assertSlotIsFree(dto.serviceId, scheduledAt, { tx });

      const created = await tx.booking.create({
        data: {
          serviceId: dto.serviceId,
          customerId,
          providerId: service.providerId,
          scheduledAt,
          totalPrice: service.price,
          notes,
          address: address || null,
          imageUrl: dto.imageUrl,
          status: BookingStatus.PENDING,
        },
        include: bookingSummaryInclude,
      });

      await tx.notification.create({
        data: {
          userId: service.providerId,
          type: NotificationType.BOOKING_CREATED,
          title: 'Yeni sifariş',
          body: `${created.customer.firstName} ${created.customer.lastName} «${created.service.title}» xidmətinə sifariş verdi.`,
          data: { bookingId: created.id },
        },
      });

      return created;
    });

    return this.mapBooking(booking);
  }

  async reschedule(id: string, providerId: string, dto: RescheduleBookingDto) {
    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      throw new BadRequestException('Yeni tarix gələcəkdə olmalıdır');
    }

    const messageContent = dto.message.trim();
    if (!messageContent) {
      throw new BadRequestException('Müştəriyə mesaj yazmaq mütləqdir');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        service: { select: { title: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
        provider: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!booking) throw new NotFoundException('Sifariş tapılmadı');
    if (booking.providerId !== providerId) {
      throw new ForbiddenException('Bu sifarişi yenidən planlaşdırmaq icazəniz yoxdur');
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Yalnız gözləyən sifarişlər yenidən planlaşdırıla bilər');
    }
    if (booking.proposedScheduledAt) {
      throw new BadRequestException('Müştərinin cavabı gözlənilir. Yeni təklif göndərmək olmaz');
    }

    const formattedDate = this.formatScheduledAt(scheduledAt);
    const conversationMessage = `${messageContent}\n\nTəklif olunan yeni tarix: ${formattedDate}`;

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.availabilityService.lockProviderBookings(tx, booking.providerId);
      await this.availabilityService.assertSlotIsFree(booking.serviceId, scheduledAt, {
        excludeBookingId: booking.id,
        tx,
      });

      const result = await tx.booking.update({
        where: { id },
        data: { proposedScheduledAt: scheduledAt },
        include: bookingSummaryInclude,
      });

      const conversation = await tx.conversation.upsert({
        where: {
          customerId_providerId: {
            customerId: booking.customerId,
            providerId: booking.providerId,
          },
        },
        create: {
          customerId: booking.customerId,
          providerId: booking.providerId,
          bookingId: booking.id,
          messages: {
            create: {
              senderId: providerId,
              content: conversationMessage,
            },
          },
        },
        update: {
          bookingId: booking.id,
          updatedAt: new Date(),
          messages: {
            create: {
              senderId: providerId,
              content: conversationMessage,
            },
          },
        },
      });

      await tx.notification.create({
        data: {
          userId: booking.customerId,
          type: NotificationType.BOOKING_RESCHEDULE_PROPOSED,
          title: 'Yeni tarix təklifi',
          body: `«${booking.service.title}» sifarişi üçün yeni tarix təklif edildi: ${formattedDate}. Mesaj: ${messageContent}. Zəhmət olmasa təsdiq edin.`,
          data: {
            bookingId: booking.id,
            conversationId: conversation.id,
            proposedScheduledAt: scheduledAt.toISOString(),
          },
        },
      });

      return result;
    });

    return this.mapBooking(updated);
  }

  async confirmReschedule(id: string, customerId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        service: { select: { title: true } },
        provider: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!booking) throw new NotFoundException('Sifariş tapılmadı');
    if (booking.customerId !== customerId) {
      throw new ForbiddenException('Bu sifarişi təsdiqləmək icazəniz yoxdur');
    }
    if (!booking.proposedScheduledAt) {
      throw new BadRequestException('Təsdiq gözləyən tarix təklifi yoxdur');
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Bu sifariş üçün tarix təklifi təsdiqlənə bilməz');
    }

    const formattedDate = this.formatScheduledAt(booking.proposedScheduledAt);

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.availabilityService.lockProviderBookings(tx, booking.providerId);
      await this.availabilityService.assertSlotIsFree(
        booking.serviceId,
        booking.proposedScheduledAt!,
        { excludeBookingId: booking.id, tx },
      );

      const result = await tx.booking.update({
        where: { id },
        data: {
          scheduledAt: booking.proposedScheduledAt!,
          proposedScheduledAt: null,
          status: BookingStatus.CONFIRMED,
        },
        include: bookingSummaryInclude,
      });

      await tx.notification.create({
        data: {
          userId: booking.providerId,
          type: NotificationType.BOOKING_CONFIRMED,
          title: 'Yeni tarix təsdiqləndi',
          body: `Müştəri «${booking.service.title}» sifarişi üçün təklif etdiyiniz ${formattedDate} tarixini təsdiqlədi.`,
          data: { bookingId: booking.id },
        },
      });

      return result;
    });

    return this.mapBooking(updated);
  }

  async rejectReschedule(id: string, customerId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        service: { select: { title: true } },
        provider: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!booking) throw new NotFoundException('Sifariş tapılmadı');
    if (booking.customerId !== customerId) {
      throw new ForbiddenException('Bu sifarişi rədd etmək icazəniz yoxdur');
    }
    if (!booking.proposedScheduledAt) {
      throw new BadRequestException('Rədd ediləcək tarix təklifi yoxdur');
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Bu sifariş üçün tarix təklifi rədd edilə bilməz');
    }

    const formattedDate = this.formatScheduledAt(booking.proposedScheduledAt);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.booking.update({
        where: { id },
        data: { proposedScheduledAt: null },
        include: bookingSummaryInclude,
      });

      await tx.notification.create({
        data: {
          userId: booking.providerId,
          type: NotificationType.BOOKING_CANCELLED,
          title: 'Yeni tarix rədd edildi',
          body: `Müştəri «${booking.service.title}» sifarişi üçün təklif etdiyiniz ${formattedDate} tarixini rədd etdi.`,
          data: { bookingId: booking.id },
        },
      });

      return result;
    });

    return this.mapBooking(updated);
  }

  async updateStatus(id: string, userId: string, role: string, dto: UpdateBookingStatusDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Sifariş tapılmadı');

    const isProvider = booking.providerId === userId;
    const isCustomer = booking.customerId === userId;
    const isAdmin = role === UserRole.ADMIN;

    if (!isProvider && !isCustomer && !isAdmin) {
      throw new ForbiddenException('Bu sifarişi idarə etmək icazəniz yoxdur');
    }

    this.validateStatusTransition(
      booking.status as BookingStatus,
      dto.status,
      isProvider,
      isCustomer,
      isAdmin,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.booking.update({
        where: { id },
        data: { status: dto.status },
        include: bookingSummaryInclude,
      });

      if (dto.status === BookingStatus.CONFIRMED && isProvider) {
        await tx.notification.create({
          data: {
            userId: booking.customerId,
            type: NotificationType.BOOKING_CONFIRMED,
            title: 'Sifariş təsdiqləndi',
            body: `«${result.service.title}» sifarişiniz ${this.formatScheduledAt(result.scheduledAt)} tarixinə təsdiqləndi.`,
            data: { bookingId: result.id },
          },
        });
      }

      if (dto.status === BookingStatus.REJECTED && isProvider) {
        await tx.notification.create({
          data: {
            userId: booking.customerId,
            type: NotificationType.BOOKING_CANCELLED,
            title: 'Sifariş rədd edildi',
            body: `«${result.service.title}» sifarişiniz xidmət verən tərəfindən rədd edildi.`,
            data: { bookingId: result.id },
          },
        });
      }

      if (dto.status === BookingStatus.COMPLETED) {
        await tx.notification.create({
          data: {
            userId: booking.customerId,
            type: NotificationType.BOOKING_COMPLETED,
            title: 'Sifariş tamamlandı',
            body: `«${result.service.title}» sifarişiniz tamamlandı. İstəsəniz rəy yaza bilərsiniz.`,
            data: { bookingId: result.id },
          },
        });
      }

      if (dto.status === BookingStatus.CANCELLED) {
        const recipientId = isCustomer ? booking.providerId : booking.customerId;
        const actorLabel = isAdmin
          ? 'idarəçi'
          : isCustomer
            ? 'müştəri'
            : 'xidmət verən';
        await tx.notification.create({
          data: {
            userId: recipientId,
            type: NotificationType.BOOKING_CANCELLED,
            title: 'Sifariş ləğv edildi',
            body: `«${result.service.title}» sifarişi ${actorLabel} tərəfindən ləğv edildi.`,
            data: { bookingId: result.id },
          },
        });
      }

      return result;
    });

    return this.mapBooking(updated);
  }

  private formatScheduledAt(date: Date): string {
    return new Intl.DateTimeFormat('az-AZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private mapBooking(booking: {
    id: string;
    serviceId: string;
    service: { title: string };
    customerId: string;
    customer: { firstName: string; lastName: string };
    providerId: string;
    provider: { firstName: string; lastName: string };
    scheduledAt: Date;
    proposedScheduledAt?: Date | null;
    status: string;
    totalPrice: { toNumber(): number };
    notes: string | null;
    address?: string | null;
    imageUrl?: string | null;
    review?: { id: string } | null;
    createdAt: Date;
  }) {
    return {
      id: booking.id,
      serviceId: booking.serviceId,
      serviceTitle: booking.service.title,
      customerId: booking.customerId,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      providerId: booking.providerId,
      providerName: `${booking.provider.firstName} ${booking.provider.lastName}`,
      scheduledAt: booking.scheduledAt.toISOString(),
      proposedScheduledAt: booking.proposedScheduledAt?.toISOString(),
      status: booking.status,
      totalPrice: booking.totalPrice.toNumber(),
      notes: booking.notes ?? undefined,
      address: booking.address ?? undefined,
      imageUrl: booking.imageUrl ?? undefined,
      hasReview: !!booking.review,
      createdAt: booking.createdAt.toISOString(),
    };
  }

  private validateStatusTransition(
    current: BookingStatus,
    next: BookingStatus,
    isProvider: boolean,
    isCustomer: boolean,
    isAdmin: boolean,
  ) {
    if (current === next) return;
    if (isAdmin) return;

    const providerTransitions: Partial<Record<BookingStatus, BookingStatus[]>> = {
      [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.REJECTED],
      [BookingStatus.CONFIRMED]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
      [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED],
    };

    const customerTransitions: Partial<Record<BookingStatus, BookingStatus[]>> = {
      [BookingStatus.PENDING]: [BookingStatus.CANCELLED],
      [BookingStatus.CONFIRMED]: [BookingStatus.CANCELLED],
    };

    const allowed = isProvider
      ? providerTransitions[current] ?? []
      : isCustomer
        ? customerTransitions[current] ?? []
        : [];

    if (!allowed.includes(next)) {
      throw new BadRequestException('Bu status dəyişikliyi icazəli deyil');
    }
  }
}
