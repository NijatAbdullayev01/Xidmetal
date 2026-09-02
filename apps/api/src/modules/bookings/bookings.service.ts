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
  BOOKING_MAIL_ENABLED,
  buildBookingMailContent,
  bookingStatusToMailEvent,
  shouldSendCustomerStatusMail,
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
  isAzerbaijanLocation,
  catalogLocationCentroid,
  locationsServeSameCity,
  matchCatalogLocationFromText,
  resolveServiceCity,
  normalizeBookingOrderNumber,
  formatAzDateTime,
  type BookingSummary,
} from '@xidmetal/shared';
import { DispatchOfferStatus, ServiceStatus } from '@prisma/client';
import { redactBookingPiiForOffer } from './booking-pii';
import { AvailabilityService } from '../availability/availability.service';
import { shouldNotifyCustomerOnConfirmOrReject } from './booking-status-notify';
import { RealtimeService } from '../realtime/realtime.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { TrackingService } from '../tracking/tracking.service';
import { GeoService } from '../geo/geo.service';
import { CommissionService } from '../commission/commission.service';
import { NotificationChannelsService } from '../../common/notifications/notification-channels.service';
import { MetricsService } from '../../common/metrics/metrics.service';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';
import { ServiceCapacityService } from '../../common/booking/service-capacity.service';
import {
  assertIdempotencyPayloadCompatible,
  hashIdempotencyPayload,
  normalizeIdempotencyKey,
} from '../../common/idempotency/idempotency.helpers';
import { isAssignedProvider } from './booking-access';
import {
  allocateBookingOrderNumber,
  bookingOrderNumberSearchWhere,
} from './booking-order-number';

const bookingSummaryInclude = {
  service: { select: { id: true, title: true } },
  team: { select: { id: true, name: true } },
  customer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  provider: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      providerProfile: { select: { rating: true, reviewCount: true } },
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
    private capacity: ServiceCapacityService,
    @Optional() private channels?: NotificationChannelsService,
    @Optional() private realtime?: RealtimeService,
    @Optional()
    @Inject(forwardRef(() => DispatchService))
    private dispatch?: DispatchService,
    @Optional()
    @Inject(forwardRef(() => TrackingService))
    private tracking?: TrackingService,
    @Optional()
    @Inject(forwardRef(() => GeoService))
    private geo?: GeoService,
    @Optional()
    @Inject(forwardRef(() => CommissionService))
    private commission?: CommissionService,
  ) {}

  async findById(id: string, userId: string, role: string) {
    const booking = await this.prisma.booking.findUnique({
      where: this.bookingLookupWhere(id),
      include: bookingSummaryInclude,
    });
    if (!booking) {
      throw new NotFoundException('Sifariş tapılmadı');
    }

    const isAssignedProviderUser = isAssignedProvider(userId, booking);

    const isParticipant =
      booking.customerId === userId || isAssignedProviderUser;

    let dispatchOffer:
      | {
          id: string;
          distanceM: number | null;
          expiresAt: Date;
        }
      | undefined;

    if (role === UserRole.PROVIDER && !isParticipant) {
      const offer = await this.prisma.dispatchOffer.findFirst({
        where: {
          bookingId: booking.id,
          providerId: userId,
          status: {
            in: [DispatchOfferStatus.PENDING, DispatchOfferStatus.ACCEPTED],
          },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, distanceM: true, expiresAt: true, status: true },
      });
      if (
        !offer ||
        (offer.status === DispatchOfferStatus.PENDING &&
          offer.expiresAt <= new Date())
      ) {
        throw new NotFoundException('Sifariş tapılmadı');
      }
      if (offer.status === DispatchOfferStatus.PENDING) {
        dispatchOffer = {
          id: offer.id,
          distanceM: offer.distanceM,
          expiresAt: offer.expiresAt,
        };
      }
    } else if (role !== UserRole.ADMIN && !isParticipant) {
      throw new NotFoundException('Sifariş tapılmadı');
    } else if (
      role === UserRole.PROVIDER &&
      booking.type === BookingType.INSTANT &&
      booking.status === BookingStatus.PENDING
    ) {
      const offer = await this.prisma.dispatchOffer.findFirst({
        where: {
          bookingId: booking.id,
          providerId: userId,
          status: DispatchOfferStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
        select: { id: true, distanceM: true, expiresAt: true },
      });
      if (offer) {
        dispatchOffer = offer;
      }
    }

    return await this.mapBooking(booking, dispatchOffer);
  }

  async findAll(
    userId: string,
    role: string,
    page = 1,
    limit = 20,
    status?: BookingStatus,
    statuses?: BookingStatus[],
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const statusFilter =
      statuses && statuses.length > 0
        ? { status: { in: statuses } }
        : status
          ? { status }
          : {};

    const now = new Date();
    const scopedWhere =
      role === UserRole.PROVIDER
        ? {
            AND: [
              statusFilter,
              {
                OR: [
                  // SCHEDULED və ya qəbul olunmuş INSTANT (acceptedAt dolu)
                  {
                    providerId: userId,
                    OR: [
                      { type: BookingType.SCHEDULED },
                      {
                        type: BookingType.INSTANT,
                        acceptedAt: { not: null },
                      },
                    ],
                  },
                  // Aktiv təklifi olan təcili sifarişlər (formaya uyğun onlayn namizədlər)
                  {
                    type: BookingType.INSTANT,
                    status: BookingStatus.PENDING,
                    dispatchOffers: {
                      some: {
                        providerId: userId,
                        status: DispatchOfferStatus.PENDING,
                        expiresAt: { gt: now },
                      },
                    },
                  },
                ],
              },
            ],
          }
        : role === UserRole.ADMIN
          ? { ...statusFilter }
          : { customerId: userId, ...statusFilter };

    const orderNumberFilter = bookingOrderNumberSearchWhere(search);
    const where = orderNumberFilter
      ? { AND: [scopedWhere, orderNumberFilter] }
      : scopedWhere;

    const providerOfferInclude =
      role === UserRole.PROVIDER
        ? {
            dispatchOffers: {
              where: {
                providerId: userId,
                status: DispatchOfferStatus.PENDING,
                expiresAt: { gt: now },
              },
              take: 1,
              orderBy: { createdAt: 'desc' as const },
              select: {
                id: true,
                distanceM: true,
                expiresAt: true,
              },
            },
          }
        : {};

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          ...bookingSummaryInclude,
          ...providerOfferInclude,
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items: await Promise.all(
        items.map((b: (typeof items)[number]) => {
          const offer =
            'dispatchOffers' in b &&
            Array.isArray(b.dispatchOffers) &&
            b.dispatchOffers[0]
              ? b.dispatchOffers[0]
              : undefined;
          return this.mapBooking(b, offer);
        }),
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
      notes: dto.notes?.trim() || null,
      address: dto.address ?? null,
      imageUrl: dto.imageUrl ?? null,
      destLat: dto.destLat ?? null,
      destLng: dto.destLng ?? null,
      originLat: dto.originLat ?? null,
      originLng: dto.originLng ?? null,
      minRating: dto.minRating ?? null,
      minPrice: dto.minPrice ?? null,
      maxPrice: dto.maxPrice ?? null,
      serviceLocation: dto.serviceLocation ?? null,
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

    if (isInstant && !idempotencyKey) {
      throw new BadRequestException(
        'Təcili sifariş üçün Idempotency-Key başlığı məcburidir',
      );
    }

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

    const imageUrl = dto.imageUrl
      ? await this.storageService.assertOwnedUploadUrl(
          dto.imageUrl,
          'bookings',
          customerId,
        )
      : undefined;

    let destCoords = this.normalizeCoordPair(dto.destLat, dto.destLng, 'Təyinat');
    if (!destCoords && dto.address?.trim()) {
      destCoords = await this.resolveDestFromAddress(dto.address.trim());
    }
    if (!destCoords && isInstant) {
      const catalogLocation =
        (dto.serviceLocation?.trim() &&
        isAzerbaijanLocation(dto.serviceLocation.trim())
          ? dto.serviceLocation.trim()
          : null) ??
        (dto.address?.trim()
          ? matchCatalogLocationFromText(dto.address.trim())
          : null);
      if (catalogLocation) {
        destCoords = catalogLocationCentroid(catalogLocation);
      }
    }
    const originCoords = this.normalizeCoordPair(dto.originLat, dto.originLng, 'Mənşə');

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
        throw new ForbiddenException('Bu xidmət verən hələ təsdiqlənməyib');
      }

      if (service.providerId === customerId) {
        throw new BadRequestException('Öz xidmətinizə sifariş verə bilməzsiniz');
      }

      const notes = dto.notes?.trim() || null;

      const address = dto.address?.trim();
      if (!service.isRemote && !address) {
        throw new BadRequestException('Ünvan daxil edin');
      }

      if (isInstant && !destCoords) {
        throw new BadRequestException(
          'Ünvanə şəhər və ya rayon yazın (məs. Bakı, Gəncə)',
        );
      }

      const serviceLocation = this.resolveInstantServiceLocation({
        isInstant,
        requested: dto.serviceLocation,
        serviceLocation: service.location,
        address,
      });

      if (
        isInstant &&
        service.location &&
        !locationsServeSameCity(service.location, serviceLocation!)
      ) {
        throw new BadRequestException(
          'Seçilmiş xidmət sifariş ərazisinə uyğun deyil',
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

      const orderNumber = await allocateBookingOrderNumber(tx);

      const teamId = isInstant
        ? null
        : await this.capacity.assignFreeTeam(dto.serviceId, scheduledAt, tx);

      const created = await tx.booking.create({
        data: {
          orderNumber,
          serviceId: dto.serviceId,
          customerId,
          providerId: service.providerId,
          teamId,
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
            body: `${created.customer.firstName} ${created.customer.lastName} «${created.service.title}» xidmətinə sifariş verdi (${created.orderNumber}).`,
            data: { bookingId: created.id },
          },
        });
      }

      return { created, serviceLocation };
    });

    const { created: createdBooking, serviceLocation } = booking;

    if (!isInstant) {
      void this.safeSendBookingMail({
        to: createdBooking.provider.email,
        event: NotificationType.BOOKING_CREATED,
        serviceTitle: createdBooking.service.title,
        scheduledAtLabel: this.formatScheduledAt(createdBooking.scheduledAt),
        orderNumber: createdBooking.orderNumber,
        bookingId: createdBooking.id,
      });
      this.channels?.deliverAfterInApp({
        userId: createdBooking.providerId,
        title: 'Yeni sifariş',
        body: `${createdBooking.customer.firstName} ${createdBooking.customer.lastName} «${createdBooking.service.title}» xidmətinə sifariş verdi (${createdBooking.orderNumber}).`,
        type: NotificationType.BOOKING_CREATED,
        data: { bookingId: createdBooking.id },
        serviceTitle: createdBooking.service.title,
        scheduledAtLabel: this.formatScheduledAt(createdBooking.scheduledAt),
      });
    } else {
      void this.dispatch
        ?.startForBooking(createdBooking.id, {
          minRating: dto.minRating,
          minPrice: dto.minPrice,
          maxPrice: dto.maxPrice,
          ...(serviceLocation
            ? { serviceCity: resolveServiceCity(serviceLocation) }
            : {}),
        })
        .catch((err) => {
          this.logger.warn(
            `Dispatch start uğursuz: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
    }

    this.metrics.incBookingCreated(
      isInstant ? BookingType.INSTANT : BookingType.SCHEDULED,
    );

    const summary = await this.mapBooking(createdBooking);

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
      throw new BadRequestException('Xidmət alana mesaj yazmaq mütləqdir');
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
    if (!isAssignedProvider(providerId, booking)) {
      throw new ForbiddenException(
        'Təcili sifarişi yalnız qəbul etdikdən sonra yenidən planlaşdırmaq olar',
      );
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Yalnız gözləyən sifarişlər yenidən planlaşdırıla bilər');
    }
    if (booking.proposedScheduledAt) {
      throw new BadRequestException('Xidmət alanın cavabı gözlənilir. Yeni təklif göndərmək olmaz');
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

      const teamId = await this.capacity.assignFreeTeam(
        booking.serviceId,
        booking.proposedScheduledAt!,
        tx,
        booking.id,
      );

      const result = await tx.booking.update({
        where: { id },
        data: {
          scheduledAt: booking.proposedScheduledAt!,
          proposedScheduledAt: null,
          status: BookingStatus.CONFIRMED,
          teamId,
          ...(booking.acceptedAt ? {} : { acceptedAt: new Date() }),
        },
        include: bookingSummaryInclude,
      });

      await tx.notification.create({
        data: {
          userId: booking.providerId,
          type: NotificationType.BOOKING_CONFIRMED,
          title: 'Yeni tarix təsdiqləndi',
          body: `Xidmət alan «${booking.service.title}» sifarişi üçün təklif etdiyiniz ${formattedDate} tarixini təsdiqlədi.`,
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
          body: `Xidmət alan «${booking.service.title}» sifarişi üçün təklif etdiyiniz ${formattedDate} tarixini rədd etdi.`,
          data: { bookingId: booking.id },
        },
      });

      return result;
    });

    return await this.mapBooking(updated);
  }

  /**
   * Qəbul olunmuş təcili icraçını buraxıb başqa onlayn xidmət verən axtarır.
   */
  async skipProvider(id: string, userId: string, role: string) {
    const booking = await this.prisma.booking.findUnique({
      where: this.bookingLookupWhere(id),
    });
    if (!booking) throw new NotFoundException('Sifariş tapılmadı');

    if (role === UserRole.ADMIN) {
      throw new ForbiddenException('İdarəçi sifarişə müdaxilə edə bilməz');
    }
    if (booking.customerId !== userId) {
      throw new ForbiddenException('Bu sifarişi idarə etmək icazəniz yoxdur');
    }

    if (!this.dispatch) {
      throw new BadRequestException('Axtarış hazırda əlçatan deyil');
    }

    await this.dispatch.skipAcceptedProvider(booking.id, booking.customerId);
    this.tracking?.invalidateBookingCache(booking.id);
    return this.findById(booking.id, userId, role);
  }

  async updateStatus(id: string, userId: string, role: string, dto: UpdateBookingStatusDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Sifariş tapılmadı');

    if (role === UserRole.ADMIN) {
      throw new ForbiddenException('İdarəçi sifarişə müdaxilə edə bilməz');
    }

    const isProvider = isAssignedProvider(userId, booking);
    const isCustomer = booking.customerId === userId;

    if (!isProvider && !isCustomer) {
      throw new ForbiddenException('Bu sifarişi idarə etmək icazəniz yoxdur');
    }

    // Borc üzündən bağlı hesab yeni sifariş qəbul edə bilməz
    if (isProvider && dto.status === BookingStatus.CONFIRMED) {
      await this.commission?.assertProviderCanOperate(booking.providerId);
    }

    if (
      !isBookingTransitionAllowed(booking.status as BookingStatus, dto.status, {
        isProvider,
        isCustomer,
        isAdmin: false,
      })
    ) {
      throw new BadRequestException('Bu status dəyişikliyi icazəli deyil');
    }

    // INSTANT: PENDING→CONFIRMED/REJECTED yalnız dispatch offer accept/reject ilə
    if (
      booking.type === BookingType.INSTANT &&
      booking.status === BookingStatus.PENDING &&
      (dto.status === BookingStatus.CONFIRMED ||
        dto.status === BookingStatus.REJECTED)
    ) {
      throw new BadRequestException(
        'Təcili sifariş yalnız təklif qəbulu/rəddi ilə təsdiqlənir',
      );
    }

    if (
      dto.status === BookingStatus.CANCELLED ||
      dto.status === BookingStatus.REJECTED
    ) {
      const reason = dto.cancelReason?.trim() ?? '';
      if (reason.length < 3) {
        throw new BadRequestException(
          dto.status === BookingStatus.REJECTED
            ? 'İmtina səbəbi tələb olunur (minimum 3 simvol)'
            : 'Ləğv səbəbi tələb olunur (minimum 3 simvol)',
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const cancelMeta =
        dto.status === BookingStatus.CANCELLED
          ? {
              cancelReason: dto.cancelReason!.trim(),
              cancelledBy: isCustomer ? 'CUSTOMER' : 'PROVIDER',
              cancelledAt: now,
            }
          : dto.status === BookingStatus.REJECTED
            ? {
                cancelReason: dto.cancelReason!.trim(),
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

      const changed = await tx.booking.updateMany({
        where: { id, status: booking.status },
        data: { status: dto.status, ...cancelMeta, ...lifecycleMeta },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Sifariş statusu artıq dəyişib. Səhifəni yeniləyin');
      }
      const result = await tx.booking.findUniqueOrThrow({
        where: { id },
        include: bookingSummaryInclude,
      });

      if (
        dto.status === BookingStatus.CONFIRMED &&
        shouldNotifyCustomerOnConfirmOrReject(isProvider, false)
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
        shouldNotifyCustomerOnConfirmOrReject(isProvider, false)
      ) {
        const actorLabel = 'xidmət verən';
        const reasonSuffix = dto.cancelReason?.trim()
          ? ` Səbəb: ${dto.cancelReason.trim()}`
          : '';
        await tx.notification.create({
          data: {
            userId: booking.customerId,
            type: NotificationType.BOOKING_REJECTED,
            title: 'Sifariş rədd edildi',
            body: `«${result.service.title}» sifarişiniz ${actorLabel} tərəfindən rədd edildi.${reasonSuffix}`,
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
        // INSTANT: yalnız qəbul etmiş xidmət verənə bildiriş (seed providerId yox)
        const hasAssignedProvider =
          booking.type !== BookingType.INSTANT || booking.acceptedAt != null;
        const recipientId = isCustomer
          ? hasAssignedProvider
            ? booking.providerId
            : null
          : booking.customerId;
        if (recipientId) {
          const actorLabel = isCustomer ? 'xidmət alan' : 'xidmət verən';
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
      }

      return result;
    });

    const hasAssignedProvider =
      booking.type !== BookingType.INSTANT || booking.acceptedAt != null;

    this.enqueueStatusEmails(updated, {
      isProvider,
      isCustomer,
      isAdmin: false,
      cancelReason: dto.cancelReason?.trim(),
      status: dto.status,
      notifyAssignedProvider: hasAssignedProvider,
    });

    const statusParticipants = [updated.customerId];
    if (hasAssignedProvider) {
      statusParticipants.push(updated.providerId);
    }
    this.realtime?.emitBookingStatus(
      {
        bookingId: updated.id,
        status: dto.status,
        timestamp: new Date().toISOString(),
      },
      statusParticipants,
    );
    this.tracking?.invalidateBookingCache(updated.id);

    if (
      booking.type === BookingType.INSTANT &&
      booking.status === BookingStatus.PENDING &&
      dto.status === BookingStatus.CANCELLED
    ) {
      void this.dispatch?.abortForBooking(booking.id).catch((err) => {
        this.logger.debug(
          `Dispatch abort: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    }

    if (
      booking.type === BookingType.INSTANT &&
      hasAssignedProvider &&
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

    if (dto.status === BookingStatus.COMPLETED) {
      void this.commission
        ?.onBookingCompleted(
          booking.providerId,
          booking.id,
          Number(booking.totalPrice),
        )
        .catch((err) => {
          this.logger.warn(
            `Komissiya hesablanmadı: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
    }

    return await this.mapBooking(updated);
  }

  private enqueueStatusEmails(
    booking: {
      id: string;
      orderNumber: string;
      scheduledAt: Date;
      service: { title: string };
      customer: { id: string; email: string };
      provider: { id: string; email: string };
    },
    meta: {
      isProvider: boolean;
      isCustomer: boolean;
      isAdmin: boolean;
      cancelReason?: string;
      status: BookingStatus;
      /** INSTANT qəbul olunmayıbsa seed provider-ə mail/push getməsin */
      notifyAssignedProvider?: boolean;
    },
  ) {
    const event = bookingStatusToMailEvent(meta.status);
    if (!event) return;

    if (meta.status === BookingStatus.CANCELLED) {
      const notifyProvider = meta.notifyAssignedProvider !== false;
      if (meta.isCustomer && !notifyProvider) {
        return;
      }
      const recipientEmail = meta.isCustomer
        ? booking.provider.email
        : booking.customer.email;
      const recipientId = meta.isCustomer
        ? booking.provider.id
        : booking.customer.id;
      const actorLabel = meta.isAdmin
        ? 'idarəçi'
        : meta.isCustomer
          ? 'xidmət alan'
          : 'xidmət verən';
      void this.safeSendBookingMail({
        to: recipientEmail,
        event,
        serviceTitle: booking.service.title,
        actorLabel,
        cancelReason: meta.cancelReason,
        orderNumber: booking.orderNumber,
        bookingId: booking.id,
      });
      this.channels?.deliverAfterInApp({
        userId: recipientId,
        title: 'Sifariş ləğv edildi',
        body: `«${booking.service.title}» sifarişi (${booking.orderNumber}) ${actorLabel} tərəfindən ləğv edildi.${
          meta.cancelReason ? ` Səbəb: ${meta.cancelReason}` : ''
        }`,
        type: event,
        data: { bookingId: booking.id },
        serviceTitle: booking.service.title,
      });
      return;
    }

    // Push/WS: CONFIRMED / REJECTED / EN_ROUTE / ARRIVED / IN_PROGRESS / COMPLETED
    // E-poçt: yalnız CONFIRMED və COMPLETED
    if (shouldSendCustomerStatusMail(meta.status)) {
      void this.safeSendBookingMail({
        to: booking.customer.email,
        event,
        serviceTitle: booking.service.title,
        scheduledAtLabel: this.formatScheduledAt(booking.scheduledAt),
        orderNumber: booking.orderNumber,
        bookingId: booking.id,
      });
    }

    const channelCopy = this.statusChannelCopy(
      event,
      booking.service.title,
      this.formatScheduledAt(booking.scheduledAt),
      meta.status === BookingStatus.REJECTED ? meta.cancelReason : undefined,
      booking.orderNumber,
    );
    if (channelCopy) {
      this.channels?.deliverAfterInApp({
        userId: booking.customer.id,
        title: channelCopy.title,
        body: channelCopy.body,
        type: event,
        data: { bookingId: booking.id },
        serviceTitle: booking.service.title,
        scheduledAtLabel: this.formatScheduledAt(booking.scheduledAt),
      });
    }
  }

  private statusChannelCopy(
    event: NotificationType,
    serviceTitle: string,
    scheduledAtLabel: string,
    cancelReason?: string,
    orderNumber?: string,
  ): { title: string; body: string } | null {
    const ref = orderNumber ? ` (${orderNumber})` : '';
    switch (event) {
      case NotificationType.BOOKING_CONFIRMED:
        return {
          title: 'Sifariş təsdiqləndi',
          body: `«${serviceTitle}» sifarişiniz${ref} ${scheduledAtLabel} tarixinə təsdiqləndi.`,
        };
      case NotificationType.BOOKING_REJECTED:
        return {
          title: 'Sifariş rədd edildi',
          body: `«${serviceTitle}» sifarişiniz${ref} rədd edildi.${
            cancelReason ? ` Səbəb: ${cancelReason}` : ''
          }`,
        };
      case NotificationType.BOOKING_EN_ROUTE:
        return {
          title: 'Xidmət verən yoldadır',
          body: `«${serviceTitle}» sifarişiniz${ref} üçün xidmət verən yola çıxdı.`,
        };
      case NotificationType.BOOKING_ARRIVED:
        return {
          title: 'Xidmət verən ünvanda',
          body: `«${serviceTitle}» sifarişiniz${ref} üçün xidmət verən ünvana çatıb.`,
        };
      case NotificationType.BOOKING_IN_PROGRESS:
        return {
          title: 'Sifariş başladı',
          body: `«${serviceTitle}» sifarişiniz${ref} icra olunur.`,
        };
      case NotificationType.BOOKING_COMPLETED:
        return {
          title: 'Sifariş tamamlandı',
          body: `«${serviceTitle}» sifarişiniz${ref} tamamlandı. İstəsəniz rəy yaza bilərsiniz.`,
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
    orderNumber?: string;
    bookingId?: string;
  }) {
    if (!BOOKING_MAIL_ENABLED) return;
    try {
      const content = buildBookingMailContent(input);
      if (!content) return;
      await this.mailService.sendBookingStatusMail({
        to: input.to,
        subject: content.subject,
        intro: content.intro,
        body: content.body,
        orderNumber: input.orderNumber,
        reviewBookingId:
          input.event === NotificationType.BOOKING_COMPLETED
            ? input.bookingId
            : undefined,
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
    return formatAzDateTime(date);
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

  /** Ünvan mətnindən təyinat koordinatı (xidmət alan GPS göndərməyəndə). */
  private async resolveDestFromAddress(
    address: string,
  ): Promise<{ lat: number; lng: number } | null> {
    if (!this.geo || address.length < 2) return null;
    try {
      const hits = await this.geo.geocode(address);
      const hit = hits.find((row) => isValidCoordinates(row.lat, row.lng));
      return hit ? { lat: hit.lat, lng: hit.lng } : null;
    } catch (err) {
      this.logger.warn(
        `Ünvan geokodlaşdırılmadı: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  /**
   * INSTANT sifariş üçün xidmət ərazisini təyin edir.
   * Prioritet: xidmət alan seçimi → seed xidmət location → ünvan mətnindən match.
   */
  private resolveInstantServiceLocation(input: {
    isInstant: boolean;
    requested?: string;
    serviceLocation?: string | null;
    address?: string;
  }): string | null {
    if (!input.isInstant) return null;

    const candidates = [
      input.requested?.trim(),
      input.serviceLocation?.trim(),
      input.address ? matchCatalogLocationFromText(input.address) : null,
    ];

    for (const candidate of candidates) {
      if (candidate && isAzerbaijanLocation(candidate)) {
        return candidate;
      }
    }

    throw new BadRequestException(
      'Təcili sifariş üçün şəhər və ya rayon seçin',
    );
  }

  private bookingLookupWhere(id: string): { orderNumber: string } | { id: string } {
    const orderNumber = normalizeBookingOrderNumber(id);
    return orderNumber ? { orderNumber } : { id };
  }

  private async mapBooking(
    booking: {
      id: string;
      orderNumber: string;
      serviceId: string;
      service: { title: string };
      teamId?: string | null;
      team?: { id: string; name: string } | null;
      customerId: string;
      customer: { firstName: string; lastName: string };
      providerId: string;
      provider: {
        firstName: string;
        lastName: string;
        providerProfile?: { rating: number; reviewCount: number } | null;
      };
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
      dispatchWindowStartedAt?: Date | null;
      dispatchSkipCount?: number;
    },
    dispatchOffer?: {
      id: string;
      distanceM: number | null;
      expiresAt: Date;
    },
  ) {
    const offerPii = dispatchOffer
      ? redactBookingPiiForOffer({
          address: booking.address ?? null,
          destLat: booking.destLat ?? null,
          destLng: booking.destLng ?? null,
          originLat: booking.originLat ?? null,
          originLng: booking.originLng ?? null,
          notes: booking.notes,
          customerFirstName: booking.customer.firstName,
          customerLastName: booking.customer.lastName,
        })
      : null;

    return {
      id: booking.id,
      orderNumber: booking.orderNumber,
      serviceId: booking.serviceId,
      serviceTitle: booking.service.title,
      customerId: booking.customerId,
      customerName: offerPii
        ? offerPii.customerName
        : `${booking.customer.firstName} ${booking.customer.lastName}`,
      providerId: booking.providerId,
      providerName: `${booking.provider.firstName} ${booking.provider.lastName}`,
      providerRating: booking.provider.providerProfile?.rating ?? 0,
      providerReviewCount: booking.provider.providerProfile?.reviewCount ?? 0,
      scheduledAt: booking.scheduledAt.toISOString(),
      proposedScheduledAt: booking.proposedScheduledAt?.toISOString(),
      status: booking.status,
      type: (booking.type as BookingType | undefined) ?? BookingType.SCHEDULED,
      totalPrice: booking.totalPrice.toNumber(),
      notes: offerPii ? undefined : booking.notes ?? undefined,
      address: offerPii ? offerPii.address ?? undefined : booking.address ?? undefined,
      destLat: offerPii ? offerPii.destLat : booking.destLat ?? null,
      destLng: offerPii ? offerPii.destLng : booking.destLng ?? null,
      originLat: offerPii ? null : booking.originLat ?? null,
      originLng: offerPii ? null : booking.originLng ?? null,
      imageUrl: offerPii
        ? null
        : await this.storageService.toReadableMediaUrl(booking.imageUrl),
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
      dispatchWindowStartedAt:
        booking.dispatchWindowStartedAt?.toISOString() ?? null,
      dispatchSkipCount: booking.dispatchSkipCount ?? 0,
      dispatchOfferId: dispatchOffer?.id ?? null,
      dispatchDistanceM: dispatchOffer?.distanceM ?? null,
      dispatchExpiresAt: dispatchOffer?.expiresAt.toISOString() ?? null,
      teamId: booking.teamId ?? null,
      teamName: booking.team?.name ?? null,
    };
  }
}
