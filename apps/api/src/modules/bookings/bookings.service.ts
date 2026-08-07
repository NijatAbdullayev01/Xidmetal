import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { MailService } from '../../common/mail/mail.service';
import {
  buildBookingMailContent,
  bookingStatusToMailEvent,
} from '../../common/mail/booking-mail';
import { CreateBookingDto, RescheduleBookingDto, UpdateBookingStatusDto } from './dto';
import {
  UserRole,
  BookingStatus,
  BookingType,
  NotificationType,
  DISPATCH,
  isValidCoordinates,
  isBookingTransitionAllowed,
  bookingLifecycleFieldsForStatus,
  type BookingSummary,
} from '@xidmetal/shared';
import { ServiceStatus } from '@prisma/client';
import { AvailabilityService } from '../availability/availability.service';
import { shouldNotifyCustomerOnConfirmOrReject } from './booking-status-notify';
import { RealtimeService } from '../realtime/realtime.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { NotificationChannelsService } from '../../common/notifications/notification-channels.service';
import { MetricsService } from '../../common/metrics/metrics.service';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';
import {
  assertIdempotencyPayloadCompatible,
  hashIdempotencyPayload,
  normalizeIdempotencyKey,
} from '../../common/idempotency/idempotency.helpers';

const bookingSummaryInclude = {
  service: { select: { id: true, title: true } },
  customer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      phoneVerifiedAt: true,
    },
  },
  provider: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      phoneVerifiedAt: true,
    },
  },
  review: { select: { id: true } },
} as const;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private prisma: PrismaService,
    private availabilityService: AvailabilityService,
    private storageService: StorageService,
    private mailService: MailService,
    private metrics: MetricsService,
    private idempotency: IdempotencyService,
    @Optional() private channels?: NotificationChannelsService,
    @Optional() private realtime?: RealtimeService,
    @Optional()
    @Inject(forwardRef(() => DispatchService))
    private dispatch?: DispatchService,
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

    return await this.mapBooking(booking);
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
      items: await Promise.all(
        items.map((b: (typeof items)[number]) => this.mapBooking(b)),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(
    customerId: string,
    dto: CreateBookingDto,
    headerIdempotencyKey?: string | null,
  ) {
    const idempotencyKey = normalizeIdempotencyKey(headerIdempotencyKey);
    const route = 'POST /bookings';
    const requestFingerprint = {
      serviceId: dto.serviceId,
      type: dto.type ?? BookingType.SCHEDULED,
      scheduledAt: dto.scheduledAt ?? null,
      notes: dto.notes ?? null,
      address: dto.address ?? null,
      imageUrl: dto.imageUrl ?? null,
      destLat: dto.destLat ?? null,
      destLng: dto.destLng ?? null,
      originLat: dto.originLat ?? null,
      originLng: dto.originLng ?? null,
    };

    if (idempotencyKey) {
      const cached = await this.idempotency.findExisting(
        idempotencyKey,
        customerId,
        route,
      );
      if (cached.hit) {
        const body = cached.body as BookingSummary & { _requestHash?: string };
        assertIdempotencyPayloadCompatible(
          body._requestHash,
          requestFingerprint,
        );
        const { _requestHash: _, ...summary } = body;
        return summary;
      }
    }

    const bookingType = dto.type ?? BookingType.SCHEDULED;
    const isInstant = bookingType === BookingType.INSTANT;

    let scheduledAt: Date;
    if (isInstant) {
      if (dto.scheduledAt) {
        scheduledAt = new Date(dto.scheduledAt);
        if (Number.isNaN(scheduledAt.getTime())) {
          throw new BadRequestException('Sifariş tarixi etibarsızdır');
        }
      } else {
        scheduledAt = new Date(
          Date.now() + DISPATCH.INSTANT_SCHEDULED_OFFSET_MIN * 60_000,
        );
      }
    } else {
      if (!dto.scheduledAt) {
        throw new BadRequestException('Sifariş tarixi tələb olunur');
      }
      scheduledAt = new Date(dto.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
        throw new BadRequestException('Sifariş tarixi gələcəkdə olmalıdır');
      }
    }

    if (dto.imageUrl) {
      this.storageService.assertAllowedMediaUrl(dto.imageUrl);
    }

    const imageUrl = dto.imageUrl
      ? this.storageService.toCanonicalMediaUrl(dto.imageUrl)
      : undefined;

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

      const destCoords = this.normalizeCoordPair(dto.destLat, dto.destLng, 'Təyinat');
      const originCoords = this.normalizeCoordPair(dto.originLat, dto.originLng, 'Mənşə');

      if (isInstant && !destCoords) {
        throw new BadRequestException(
          'Ani sifariş üçün təyinat koordinatları məcburidir',
        );
      }

      if (!isInstant) {
        // SCHEDULED: Provider üzrə seriyalaşdırma + slot re-check (TOCTOU race-i bağlayır)
        await this.availabilityService.lockProviderBookings(tx, service.providerId);
        await this.availabilityService.assertSlotIsFree(dto.serviceId, scheduledAt, {
          tx,
        });
      }
      // INSTANT: slot lock yox — capacity/BUSY accept zamanı yoxlanır; scheduledAt display window

      const created = await tx.booking.create({
        data: {
          serviceId: dto.serviceId,
          customerId,
          providerId: service.providerId,
          scheduledAt,
          totalPrice: service.price,
          notes,
          address: address || null,
          destLat: destCoords?.lat ?? null,
          destLng: destCoords?.lng ?? null,
          originLat: originCoords?.lat ?? null,
          originLng: originCoords?.lng ?? null,
          imageUrl: imageUrl ?? null,
          status: BookingStatus.PENDING,
          type: bookingType,
        },
        include: bookingSummaryInclude,
      });

      if (!isInstant) {
        await tx.notification.create({
          data: {
            userId: service.providerId,
            type: NotificationType.BOOKING_CREATED,
            title: 'Yeni sifariş',
            body: `${created.customer.firstName} ${created.customer.lastName} «${created.service.title}» xidmətinə sifariş verdi.`,
            data: { bookingId: created.id },
          },
        });
      }

      return created;
    });

    if (!isInstant) {
      void this.safeSendBookingMail({
        to: booking.provider.email,
        event: NotificationType.BOOKING_CREATED,
        serviceTitle: booking.service.title,
        scheduledAtLabel: this.formatScheduledAt(booking.scheduledAt),
      });
      this.channels?.deliverAfterInApp({
        userId: booking.providerId,
        title: 'Yeni sifariş',
        body: `${booking.customer.firstName} ${booking.customer.lastName} «${booking.service.title}» xidmətinə sifariş verdi.`,
        type: NotificationType.BOOKING_CREATED,
        data: { bookingId: booking.id },
        phone: booking.provider.phone,
        phoneVerifiedAt: booking.provider.phoneVerifiedAt,
        serviceTitle: booking.service.title,
        scheduledAtLabel: this.formatScheduledAt(booking.scheduledAt),
      });
    } else {
      void this.dispatch?.startForBooking(booking.id).catch((err) => {
        this.logger.warn(
          `Dispatch start uğursuz: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    }

    this.metrics.incBookingCreated(
      isInstant ? BookingType.INSTANT : BookingType.SCHEDULED,
    );

    const summary = await this.mapBooking(booking);

    if (idempotencyKey) {
      try {
        await this.idempotency.save({
          key: idempotencyKey,
          userId: customerId,
          route,
          statusCode: 201,
          body: {
            ...summary,
            _requestHash: hashIdempotencyPayload(requestFingerprint),
          },
        });
      } catch (error) {
        if (error instanceof ConflictException) {
          const again = await this.idempotency.findExisting(
            idempotencyKey,
            customerId,
            route,
          );
          if (again.hit) {
            const body = again.body as BookingSummary & {
              _requestHash?: string;
            };
            assertIdempotencyPayloadCompatible(
              body._requestHash,
              requestFingerprint,
            );
            const { _requestHash: _, ...cached } = body;
            return cached;
          }
        }
        throw error;
      }
    }

    return summary;
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

    return await this.mapBooking(updated);
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
          ...(booking.acceptedAt ? {} : { acceptedAt: new Date() }),
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

    return await this.mapBooking(updated);
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
          type: NotificationType.BOOKING_RESCHEDULE_REJECTED,
          title: 'Yeni tarix rədd edildi',
          body: `Müştəri «${booking.service.title}» sifarişi üçün təklif etdiyiniz ${formattedDate} tarixini rədd etdi.`,
          data: { bookingId: booking.id },
        },
      });

      return result;
    });

    return await this.mapBooking(updated);
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

    if (
      !isBookingTransitionAllowed(booking.status as BookingStatus, dto.status, {
        isProvider,
        isCustomer,
        isAdmin,
      })
    ) {
      throw new BadRequestException('Bu status dəyişikliyi icazəli deyil');
    }

    // INSTANT: PENDING→CONFIRMED/REJECTED yalnız dispatch offer accept/reject ilə
    if (
      booking.type === BookingType.INSTANT &&
      booking.status === BookingStatus.PENDING &&
      !isAdmin &&
      (dto.status === BookingStatus.CONFIRMED ||
        dto.status === BookingStatus.REJECTED)
    ) {
      throw new BadRequestException(
        'Ani sifariş yalnız təklif qəbulu/rəddi ilə təsdiqlənir',
      );
    }

    if (dto.status === BookingStatus.CANCELLED) {
      const reason = dto.cancelReason?.trim() ?? '';
      if (reason.length < 3) {
        throw new BadRequestException('Ləğv səbəbi tələb olunur (minimum 3 simvol)');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const cancelMeta =
        dto.status === BookingStatus.CANCELLED
          ? {
              cancelReason: dto.cancelReason!.trim(),
              cancelledBy: isAdmin
                ? 'ADMIN'
                : isCustomer
                  ? 'CUSTOMER'
                  : 'PROVIDER',
              cancelledAt: now,
            }
          : {};

      const lifecycleMeta = bookingLifecycleFieldsForStatus(
        dto.status,
        {
          acceptedAt: booking.acceptedAt,
          enRouteAt: booking.enRouteAt,
          arrivedAt: booking.arrivedAt,
          startedAt: booking.startedAt,
          completedAt: booking.completedAt,
        },
        now,
      );

      const result = await tx.booking.update({
        where: { id },
        data: { status: dto.status, ...cancelMeta, ...lifecycleMeta },
        include: bookingSummaryInclude,
      });

      if (
        dto.status === BookingStatus.CONFIRMED &&
        shouldNotifyCustomerOnConfirmOrReject(isProvider, isAdmin)
      ) {
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

      if (
        dto.status === BookingStatus.REJECTED &&
        shouldNotifyCustomerOnConfirmOrReject(isProvider, isAdmin)
      ) {
        const actorLabel = isAdmin ? 'idarəçi' : 'xidmət verən';
        await tx.notification.create({
          data: {
            userId: booking.customerId,
            type: NotificationType.BOOKING_REJECTED,
            title: 'Sifariş rədd edildi',
            body: `«${result.service.title}» sifarişiniz ${actorLabel} tərəfindən rədd edildi.`,
            data: { bookingId: result.id },
          },
        });
      }

      if (dto.status === BookingStatus.EN_ROUTE) {
        await tx.notification.create({
          data: {
            userId: booking.customerId,
            type: NotificationType.BOOKING_EN_ROUTE,
            title: 'Xidmət verən yoldadır',
            body: `«${result.service.title}» sifarişiniz üçün xidmət verən yola çıxdı.`,
            data: { bookingId: result.id },
          },
        });
      }

      if (dto.status === BookingStatus.ARRIVED) {
        await tx.notification.create({
          data: {
            userId: booking.customerId,
            type: NotificationType.BOOKING_ARRIVED,
            title: 'Xidmət verən ünvanda',
            body: `«${result.service.title}» sifarişiniz üçün xidmət verən ünvana çatıb.`,
            data: { bookingId: result.id },
          },
        });
      }

      if (dto.status === BookingStatus.IN_PROGRESS) {
        await tx.notification.create({
          data: {
            userId: booking.customerId,
            type: NotificationType.BOOKING_IN_PROGRESS,
            title: 'Sifariş başladı',
            body: `«${result.service.title}» sifarişiniz icra olunur.`,
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
        const reasonSuffix = dto.cancelReason?.trim()
          ? ` Səbəb: ${dto.cancelReason.trim()}`
          : '';
        await tx.notification.create({
          data: {
            userId: recipientId,
            type: NotificationType.BOOKING_CANCELLED,
            title: 'Sifariş ləğv edildi',
            body: `«${result.service.title}» sifarişi ${actorLabel} tərəfindən ləğv edildi.${reasonSuffix}`,
            data: { bookingId: result.id },
          },
        });
      }

      return result;
    });

    this.enqueueStatusEmails(updated, {
      isProvider,
      isCustomer,
      isAdmin,
      cancelReason: dto.cancelReason?.trim(),
      status: dto.status,
    });

    this.realtime?.emitBookingStatus({
      bookingId: updated.id,
      status: dto.status,
      timestamp: new Date().toISOString(),
    });

    if (
      booking.type === BookingType.INSTANT &&
      (dto.status === BookingStatus.COMPLETED ||
        dto.status === BookingStatus.CANCELLED ||
        dto.status === BookingStatus.REJECTED)
    ) {
      void this.dispatch
        ?.releaseProviderIfBusy(booking.providerId)
        .catch((err) => {
          this.logger.debug(
            `BUSY release: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
    }

    return await this.mapBooking(updated);
  }

  private enqueueStatusEmails(
    booking: {
      id: string;
      scheduledAt: Date;
      service: { title: string };
      customer: { id: string; email: string; phone?: string | null; phoneVerifiedAt?: Date | null };
      provider: { id: string; email: string; phone?: string | null; phoneVerifiedAt?: Date | null };
    },
    meta: {
      isProvider: boolean;
      isCustomer: boolean;
      isAdmin: boolean;
      cancelReason?: string;
      status: BookingStatus;
    },
  ) {
    const event = bookingStatusToMailEvent(meta.status);
    if (!event) return;

    if (meta.status === BookingStatus.CANCELLED) {
      const recipientEmail = meta.isCustomer
        ? booking.provider.email
        : booking.customer.email;
      const recipientId = meta.isCustomer
        ? booking.provider.id
        : booking.customer.id;
      const recipientPhone = meta.isCustomer
        ? booking.provider.phone
        : booking.customer.phone;
      const recipientPhoneVerifiedAt = meta.isCustomer
        ? booking.provider.phoneVerifiedAt
        : booking.customer.phoneVerifiedAt;
      const actorLabel = meta.isAdmin
        ? 'idarəçi'
        : meta.isCustomer
          ? 'müştəri'
          : 'xidmət verən';
      void this.safeSendBookingMail({
        to: recipientEmail,
        event,
        serviceTitle: booking.service.title,
        actorLabel,
        cancelReason: meta.cancelReason,
      });
      this.channels?.deliverAfterInApp({
        userId: recipientId,
        title: 'Sifariş ləğv edildi',
        body: `«${booking.service.title}» sifarişi ${actorLabel} tərəfindən ləğv edildi.${
          meta.cancelReason ? ` Səbəb: ${meta.cancelReason}` : ''
        }`,
        type: event,
        data: { bookingId: booking.id },
        phone: recipientPhone,
        phoneVerifiedAt: recipientPhoneVerifiedAt,
        serviceTitle: booking.service.title,
      });
      return;
    }

    // CONFIRMED / REJECTED / EN_ROUTE / ARRIVED / IN_PROGRESS / COMPLETED → müştəri
    void this.safeSendBookingMail({
      to: booking.customer.email,
      event,
      serviceTitle: booking.service.title,
      scheduledAtLabel: this.formatScheduledAt(booking.scheduledAt),
    });

    const channelCopy = this.statusChannelCopy(
      event,
      booking.service.title,
      this.formatScheduledAt(booking.scheduledAt),
    );
    if (channelCopy) {
      this.channels?.deliverAfterInApp({
        userId: booking.customer.id,
        title: channelCopy.title,
        body: channelCopy.body,
        type: event,
        data: { bookingId: booking.id },
        phone: booking.customer.phone,
        phoneVerifiedAt: booking.customer.phoneVerifiedAt,
        serviceTitle: booking.service.title,
        scheduledAtLabel: this.formatScheduledAt(booking.scheduledAt),
      });
    }
  }

  private statusChannelCopy(
    event: NotificationType,
    serviceTitle: string,
    scheduledAtLabel: string,
  ): { title: string; body: string } | null {
    switch (event) {
      case NotificationType.BOOKING_CONFIRMED:
        return {
          title: 'Sifariş təsdiqləndi',
          body: `«${serviceTitle}» sifarişiniz ${scheduledAtLabel} tarixinə təsdiqləndi.`,
        };
      case NotificationType.BOOKING_REJECTED:
        return {
          title: 'Sifariş rədd edildi',
          body: `«${serviceTitle}» sifarişiniz rədd edildi.`,
        };
      case NotificationType.BOOKING_EN_ROUTE:
        return {
          title: 'Xidmət verən yoldadır',
          body: `«${serviceTitle}» sifarişiniz üçün xidmət verən yola çıxdı.`,
        };
      case NotificationType.BOOKING_ARRIVED:
        return {
          title: 'Xidmət verən ünvanda',
          body: `«${serviceTitle}» sifarişiniz üçün xidmət verən ünvana çatıb.`,
        };
      case NotificationType.BOOKING_IN_PROGRESS:
        return {
          title: 'Sifariş başladı',
          body: `«${serviceTitle}» sifarişiniz icra olunur.`,
        };
      case NotificationType.BOOKING_COMPLETED:
        return {
          title: 'Sifariş tamamlandı',
          body: `«${serviceTitle}» sifarişiniz tamamlandı. İstəsəniz rəy yaza bilərsiniz.`,
        };
      default:
        return null;
    }
  }

  private async safeSendBookingMail(input: {
    to: string;
    event: Parameters<typeof buildBookingMailContent>[0]['event'];
    serviceTitle: string;
    scheduledAtLabel?: string;
    actorLabel?: string;
    cancelReason?: string;
  }) {
    try {
      const content = buildBookingMailContent(input);
      if (!content) return;
      await this.mailService.sendBookingStatusMail({
        to: input.to,
        subject: content.subject,
        intro: content.intro,
        body: content.body,
      });
    } catch (error) {
      this.logger.warn(
        `Sifariş e-poçtu göndərilmədi (${input.event}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
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

  /** Bir tərəf göndərilibsə digəri də lazımdır; ikisi də yoxdursa null */
  private normalizeCoordPair(
    lat: number | undefined,
    lng: number | undefined,
    label: string,
  ): { lat: number; lng: number } | null {
    const hasLat = lat !== undefined && lat !== null;
    const hasLng = lng !== undefined && lng !== null;
    if (!hasLat && !hasLng) return null;
    if (!hasLat || !hasLng) {
      throw new BadRequestException(`${label} üçün həm enlik, həm uzunluq lazımdır`);
    }
    if (!isValidCoordinates(lat, lng)) {
      throw new BadRequestException(`${label} koordinatları etibarsızdır`);
    }
    return { lat, lng };
  }

  private async mapBooking(booking: {
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
    type?: string;
    totalPrice: { toNumber(): number };
    notes: string | null;
    address?: string | null;
    destLat?: number | null;
    destLng?: number | null;
    originLat?: number | null;
    originLng?: number | null;
    imageUrl?: string | null;
    cancelReason?: string | null;
    cancelledBy?: string | null;
    cancelledAt?: Date | null;
    acceptedAt?: Date | null;
    enRouteAt?: Date | null;
    arrivedAt?: Date | null;
    startedAt?: Date | null;
    completedAt?: Date | null;
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
      type: (booking.type as BookingType | undefined) ?? BookingType.SCHEDULED,
      totalPrice: booking.totalPrice.toNumber(),
      notes: booking.notes ?? undefined,
      address: booking.address ?? undefined,
      destLat: booking.destLat ?? null,
      destLng: booking.destLng ?? null,
      originLat: booking.originLat ?? null,
      originLng: booking.originLng ?? null,
      imageUrl: await this.storageService.toReadableMediaUrl(booking.imageUrl),
      cancelReason: booking.cancelReason ?? undefined,
      cancelledBy: booking.cancelledBy ?? undefined,
      cancelledAt: booking.cancelledAt?.toISOString(),
      acceptedAt: booking.acceptedAt?.toISOString(),
      enRouteAt: booking.enRouteAt?.toISOString(),
      arrivedAt: booking.arrivedAt?.toISOString(),
      startedAt: booking.startedAt?.toISOString(),
      completedAt: booking.completedAt?.toISOString(),
      hasReview: !!booking.review,
      createdAt: booking.createdAt.toISOString(),
    };
  }
}
