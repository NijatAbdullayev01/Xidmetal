import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BookingStatus,
  BookingType,
  DISPATCH,
  DispatchOfferStatus,
  NotificationType,
  ProviderAvailability,
  REALTIME_EVENTS,
  computeDispatchScore,
  dispatchSearchWindowStart,
  haversineDistanceMeters,
  isDispatchSearchWindowOpen,
  isValidCoordinates,
  locationLabelsForCity,
  parseDispatchPrefs,
  providerRoom,
  providersExcludedFromRedispatch,
  rankDispatchCandidates,
  resolveServiceCity,
  type DispatchCandidate,
  type DispatchOfferPayload,
  type DispatchOfferResultPayload,
} from '@xidmetal/shared';
import { Prisma, ServiceStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { MailService } from '../../common/mail/mail.service';
import { buildBookingMailContent } from '../../common/mail/booking-mail';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationChannelsService } from '../../common/notifications/notification-channels.service';
import { redactBookingPiiForOffer } from '../bookings/booking-pii';
import {
  DispatchQueueService,
  type DeclineReofferJobData,
  type RediscoveryJobData,
  type SearchWindowJobData,
} from './dispatch-queue.service';
import { MetricsService } from '../../common/metrics/metrics.service';
import { assertDispatchAdminList } from './dispatch-access';

const offerInclude = {
  booking: {
    select: {
      id: true,
      address: true,
      destLat: true,
      destLng: true,
      scheduledAt: true,
      notes: true,
      totalPrice: true,
      status: true,
      type: true,
      customerId: true,
      serviceId: true,
      service: { select: { id: true, title: true, categoryId: true } },
      customer: {
        select: { firstName: true, lastName: true },
      },
    },
  },
} as const;

export interface DispatchStartPrefs {
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  /** resolveServiceCity nəticəsi — Bakı daxili rayonlar birləşir */
  serviceCity?: string;
}

@Injectable()
export class DispatchService implements OnModuleInit {
  private readonly logger = new Logger(DispatchService.name);
  /** Booking-ə bağlı müvəqqəti dispatch filtrləri (restart-da itir; optional) */
  private readonly dispatchPrefs = new Map<string, DispatchStartPrefs>();

  constructor(
    private prisma: PrismaService,
    private queue: DispatchQueueService,
    private config: ConfigService,
    private metrics: MetricsService,
    private mailService: MailService,
    @Optional() private realtime?: RealtimeService,
    @Optional() private channels?: NotificationChannelsService,
  ) {}

  onModuleInit(): void {
    this.queue.setSearchWindowHandler((data) =>
      this.handleSearchWindowEnd(data),
    );
    this.queue.setRediscoveryHandler((data) => this.handleRediscovery(data));
    this.queue.setDeclineReofferHandler((data) =>
      this.handleDeclineReoffer(data),
    );
  }

  private searchWindowSec(): number {
    const raw = this.config.get<string>('DISPATCH_SEARCH_WINDOW_SEC')?.trim();
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : DISPATCH.SEARCH_WINDOW_SEC;
  }

  private rediscoveryIntervalSec(): number {
    const raw = this.config
      .get<string>('DISPATCH_REDISCOVERY_INTERVAL_SEC')
      ?.trim();
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : DISPATCH.REDISCOVERY_INTERVAL_SEC;
  }

  private declineReofferCooldownSec(): number {
    const raw = this.config
      .get<string>('DISPATCH_DECLINE_REOFFER_COOLDOWN_SEC')
      ?.trim();
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : DISPATCH.DECLINE_REOFFER_COOLDOWN_SEC;
  }

  private clearPrefs(bookingId: string): void {
    this.dispatchPrefs.delete(bookingId);
  }

  private hydratePrefs(bookingId: string, stored: unknown): DispatchStartPrefs | undefined {
    const memory = this.dispatchPrefs.get(bookingId);
    if (memory && Object.keys(memory).length > 0) return memory;
    const parsed = parseDispatchPrefs(stored);
    if (parsed) {
      this.dispatchPrefs.set(bookingId, parsed);
      return parsed;
    }
    return undefined;
  }

  private async persistPrefs(
    bookingId: string,
    prefs: DispatchStartPrefs,
  ): Promise<void> {
    try {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { dispatchPrefs: prefs as Prisma.InputJsonValue },
      });
    } catch (err) {
      this.logger.warn(
        `Dispatch prefs persist booking=${bookingId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private searchWindowExpiresAt(createdAt: Date): Date {
    return new Date(createdAt.getTime() + this.searchWindowSec() * 1000);
  }

  /**
   * INSTANT booking yaradıldıqdan sonra çağırılır — namizədləri tapıb eyni anda offer göndərir.
   */
  async startForBooking(
    bookingId: string,
    prefs?: DispatchStartPrefs,
  ): Promise<void> {
    if (prefs) {
      const cleaned: DispatchStartPrefs = {};
      if (
        prefs.minRating !== undefined &&
        Number.isFinite(prefs.minRating) &&
        prefs.minRating >= 0
      ) {
        cleaned.minRating = prefs.minRating;
      }
      if (
        prefs.minPrice !== undefined &&
        Number.isFinite(prefs.minPrice) &&
        prefs.minPrice >= 0
      ) {
        cleaned.minPrice = prefs.minPrice;
      }
      if (
        prefs.maxPrice !== undefined &&
        Number.isFinite(prefs.maxPrice) &&
        prefs.maxPrice >= 0
      ) {
        cleaned.maxPrice = prefs.maxPrice;
      }
      if (prefs.serviceCity?.trim()) {
        cleaned.serviceCity = resolveServiceCity(prefs.serviceCity);
      }
      if (Object.keys(cleaned).length > 0) {
        this.dispatchPrefs.set(bookingId, cleaned);
        await this.persistPrefs(bookingId, cleaned);
      }
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: { select: { id: true, title: true, categoryId: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!booking) {
      this.logger.warn(`Dispatch start: booking yoxdur ${bookingId}`);
      this.clearPrefs(bookingId);
      return;
    }
    if (booking.type !== BookingType.INSTANT) {
      this.clearPrefs(bookingId);
      return;
    }
    if (booking.status !== BookingStatus.PENDING) {
      this.clearPrefs(bookingId);
      return;
    }

    this.hydratePrefs(bookingId, booking.dispatchPrefs);

    const windowStart = dispatchSearchWindowStart(
      booking.createdAt,
      booking.dispatchWindowStartedAt,
    );
    const delayMs = Math.max(
      0,
      this.searchWindowExpiresAt(windowStart).getTime() - Date.now(),
    );
    try {
      await this.queue.scheduleSearchWindowEnd({ bookingId }, delayMs);
    } catch (err) {
      this.logger.warn(
        `Search-window schedule uğursuz booking=${bookingId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    await this.offerNext(booking.id);
  }

  async listPendingForProvider(providerId: string) {
    const now = new Date();
    const offers = await this.prisma.dispatchOffer.findMany({
      where: {
        providerId,
        status: DispatchOfferStatus.PENDING,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      include: offerInclude,
    });
    return offers.map((o) => this.mapOffer(o));
  }

  async listForBooking(bookingId: string, role: string) {
    assertDispatchAdminList(role);

    const offers = await this.prisma.dispatchOffer.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
      include: offerInclude,
    });
    return offers.map((o) => this.mapOffer(o));
  }

  async acceptOffer(offerId: string, providerId: string) {
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const offer = await tx.dispatchOffer.findUnique({
        where: { id: offerId },
        include: {
          booking: {
            include: {
              service: { select: { categoryId: true, title: true, location: true } },
              customer: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
        },
      });

      if (!offer) throw new NotFoundException('Təklif tapılmadı');
      if (offer.providerId !== providerId) {
        throw new ForbiddenException('Bu təklifi qəbul etmək icazəniz yoxdur');
      }
      if (offer.status !== DispatchOfferStatus.PENDING) {
        throw new BadRequestException('Təklif artıq cavablanıb');
      }
      if (offer.expiresAt <= now) {
        throw new BadRequestException('Təklifin vaxtı bitib');
      }

      const booking = offer.booking;
      if (
        booking.status !== BookingStatus.PENDING ||
        booking.type !== BookingType.INSTANT
      ) {
        throw new ConflictException('Sifariş artıq təyin olunub və ya ləğv edilib');
      }

      const prefs =
        this.dispatchPrefs.get(booking.id) ??
        this.hydratePrefs(booking.id, booking.dispatchPrefs);
      const serviceCityRaw =
        prefs?.serviceCity?.trim() || booking.service.location?.trim() || '';
      const locationLabels = serviceCityRaw
        ? locationLabelsForCity(resolveServiceCity(serviceCityRaw))
        : null;

      const matchingService =
        (locationLabels && locationLabels.length > 0
          ? await tx.service.findFirst({
              where: {
                providerId,
                categoryId: booking.service.categoryId,
                title: booking.service.title,
                status: ServiceStatus.ACTIVE,
                location: { in: [...locationLabels] },
              },
              orderBy: { updatedAt: 'desc' },
            })
          : null) ??
        (await tx.service.findFirst({
          where: {
            providerId,
            categoryId: booking.service.categoryId,
            title: booking.service.title,
            status: ServiceStatus.ACTIVE,
          },
          orderBy: { updatedAt: 'desc' },
        })) ??
        (await tx.service.findFirst({
          where: {
            providerId,
            categoryId: booking.service.categoryId,
            status: ServiceStatus.ACTIVE,
          },
          orderBy: { updatedAt: 'desc' },
        }));

      if (!matchingService) {
        throw new BadRequestException(
          'Bu kateqoriyada aktiv xidmətiniz yoxdur',
        );
      }

      // Race-safe: yalnız PENDING offer + PENDING booking
      const offerUpdate = await tx.dispatchOffer.updateMany({
        where: {
          id: offerId,
          providerId,
          status: DispatchOfferStatus.PENDING,
        },
        data: {
          status: DispatchOfferStatus.ACCEPTED,
          respondedAt: now,
        },
      });
      if (offerUpdate.count !== 1) {
        throw new ConflictException('Təklif artıq cavablanıb');
      }

      const bookingUpdate = await tx.booking.updateMany({
        where: {
          id: booking.id,
          status: BookingStatus.PENDING,
          type: BookingType.INSTANT,
        },
        data: {
          status: BookingStatus.CONFIRMED,
          providerId,
          serviceId: matchingService.id,
          totalPrice: matchingService.price,
          acceptedAt: now,
        },
      });

      if (bookingUpdate.count !== 1) {
        await tx.dispatchOffer.update({
          where: { id: offerId },
          data: {
            status: DispatchOfferStatus.CANCELLED,
            respondedAt: now,
          },
        });
        throw new ConflictException('Sifariş artıq başqa icraçıya verilib');
      }

      await tx.dispatchOffer.updateMany({
        where: {
          bookingId: booking.id,
          status: DispatchOfferStatus.PENDING,
          id: { not: offerId },
        },
        data: {
          status: DispatchOfferStatus.CANCELLED,
          respondedAt: now,
        },
      });

      await tx.providerProfile.updateMany({
        where: { userId: providerId },
        data: { availability: ProviderAvailability.BUSY },
      });

      await tx.notification.create({
        data: {
          userId: booking.customerId,
          type: NotificationType.BOOKING_CONFIRMED,
          title: 'Sifariş təsdiqləndi',
          body: `«${matchingService.title}» üçün təcili sifarişiniz qəbul edildi.`,
          data: { bookingId: booking.id },
        },
      });

      const updated = await tx.booking.findUniqueOrThrow({
        where: { id: booking.id },
        include: {
          service: { select: { id: true, title: true } },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          provider: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      return { booking: updated, offerId };
    });

    this.channels?.deliverAfterInApp({
      userId: result.booking.customerId,
      title: 'Sifariş təsdiqləndi',
      body: `«${result.booking.service.title}» üçün təcili sifarişiniz qəbul edildi.`,
      type: NotificationType.BOOKING_CONFIRMED,
      data: { bookingId: result.booking.id },
      serviceTitle: result.booking.service.title,
    });
    void this.safeSendBookingMail({
      to: result.booking.customer.email,
      event: NotificationType.BOOKING_CONFIRMED,
      serviceTitle: result.booking.service.title,
      orderNumber: result.booking.orderNumber,
      bookingId: result.booking.id,
    });

    const otherPending = await this.prisma.dispatchOffer.findMany({
      where: {
        bookingId: result.booking.id,
        status: DispatchOfferStatus.CANCELLED,
        respondedAt: now,
      },
      select: { id: true, providerId: true },
    });
    for (const other of otherPending) {
      this.emitOfferResult(other.providerId, {
        offerId: other.id,
        bookingId: result.booking.id,
        status: 'CANCELLED',
        providerId,
      });
      this.metrics.incDispatchOffer('cancelled');
    }

    this.emitOfferResult(providerId, {
      offerId,
      bookingId: result.booking.id,
      status: 'ACCEPTED',
      providerId,
    });
    this.metrics.incDispatchOffer('accepted');

    this.realtime?.emitBookingStatus({
      bookingId: result.booking.id,
      status: BookingStatus.CONFIRMED,
      timestamp: now.toISOString(),
    }, [result.booking.customerId, result.booking.providerId]);

    await this.queue.cancelSearchWindowEnd(result.booking.id);
    await this.queue.cancelRediscovery(result.booking.id);
    await this.queue.cancelDeclineReoffers(result.booking.id);
    this.clearPrefs(result.booking.id);

    return this.mapOffer(
      await this.prisma.dispatchOffer.findUniqueOrThrow({
        where: { id: offerId },
        include: offerInclude,
      }),
    );
  }

  async rejectOffer(offerId: string, providerId: string, _reason?: string) {
    const now = new Date();

    const offer = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.dispatchOffer.findUnique({
        where: { id: offerId },
      });
      if (!existing) throw new NotFoundException('Təklif tapılmadı');
      if (existing.providerId !== providerId) {
        throw new ForbiddenException('Bu təklifi rədd etmək icazəniz yoxdur');
      }
      if (existing.status !== DispatchOfferStatus.PENDING) {
        throw new BadRequestException('Təklif artıq cavablanıb');
      }

      const updated = await tx.dispatchOffer.updateMany({
        where: {
          id: offerId,
          providerId,
          status: DispatchOfferStatus.PENDING,
        },
        data: {
          status: DispatchOfferStatus.REJECTED,
          respondedAt: now,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Təklif artıq cavablanıb');
      }

      return tx.dispatchOffer.findUniqueOrThrow({ where: { id: offerId } });
    });

    this.emitOfferResult(providerId, {
      offerId,
      bookingId: offer.bookingId,
      status: 'REJECTED',
      providerId,
    });
    this.metrics.incDispatchOffer('rejected');

    // 2 dəq sonra eyni xidmət verənə yenidən təklif (pəncərə açıq qaldıqca)
    void this.queue
      .scheduleDeclineReoffer(
        { bookingId: offer.bookingId, providerId },
        this.declineReofferCooldownSec() * 1000,
      )
      .catch((err) => {
        this.logger.warn(
          `Decline-reoffer schedule uğursuz: ${err instanceof Error ? err.message : String(err)}`,
        );
      });

    // Digər heç vaxt təklif almayan namizədlər
    void this.offerNext(offer.bookingId).catch((err) => {
      this.logger.warn(
        `Reject sonrası növbəti offer: ${err instanceof Error ? err.message : String(err)}`,
      );
    });

    return this.mapOffer(
      await this.prisma.dispatchOffer.findUniqueOrThrow({
        where: { id: offerId },
        include: offerInclude,
      }),
    );
  }

  /**
   * Müştəri/admin PENDING ani sifarişi ləğv edəndə — növbəni dayandırır,
   * açıq təklifləri geri çəkir. Ləğv bildirişi göndərilmir (heç kim qəbul etməyib).
   */
  async abortForBooking(bookingId: string): Promise<void> {
    const now = new Date();

    await this.queue.cancelSearchWindowEnd(bookingId);
    await this.queue.cancelRediscovery(bookingId);
    await this.queue.cancelDeclineReoffers(bookingId);

    const pending = await this.prisma.dispatchOffer.findMany({
      where: { bookingId, status: DispatchOfferStatus.PENDING },
      select: { id: true, providerId: true },
    });

    if (pending.length > 0) {
      await this.prisma.dispatchOffer.updateMany({
        where: {
          bookingId,
          status: DispatchOfferStatus.PENDING,
        },
        data: {
          status: DispatchOfferStatus.CANCELLED,
          respondedAt: now,
        },
      });

      for (const offer of pending) {
        this.emitOfferResult(offer.providerId, {
          offerId: offer.id,
          bookingId,
          status: 'CANCELLED',
        });
        this.metrics.incDispatchOffer('cancelled');
      }
    }

    this.clearPrefs(bookingId);
    this.logger.log(
      `Dispatch aborted booking=${bookingId} withdrawnOffers=${pending.length}`,
    );
  }

  /**
   * Müştəri qəbul olunmuş təcili icraçını buraxır və yenidən axtarış başladır.
   */
  async skipAcceptedProvider(bookingId: string, customerId: string): Promise<void> {
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          service: { select: { title: true } },
        },
      });

      if (!booking) throw new NotFoundException('Sifariş tapılmadı');
      if (booking.customerId !== customerId) {
        throw new ForbiddenException('Bu sifarişi idarə etmək icazəniz yoxdur');
      }
      if (booking.type !== BookingType.INSTANT) {
        throw new BadRequestException(
          'Başqa xidmət verən yalnız təcili sifarişdə axtarıla bilər',
        );
      }
      if (booking.status !== BookingStatus.CONFIRMED) {
        if (
          booking.status === BookingStatus.EN_ROUTE ||
          booking.status === BookingStatus.ARRIVED ||
          booking.status === BookingStatus.IN_PROGRESS
        ) {
          throw new BadRequestException(
            'Xidmət verən artıq yola çıxıb və ya işə başlayıb',
          );
        }
        throw new BadRequestException(
          'Hələ qəbul olunmuş xidmət verən yoxdur',
        );
      }
      if (booking.dispatchSkipCount >= DISPATCH.MAX_CUSTOMER_PROVIDER_SKIPS) {
        throw new BadRequestException(
          'Başqa xidmət verən axtarış limiti bitib. Sifarişi ləğv edib yenidən verə bilərsiniz',
        );
      }

      const acceptedOffer = await tx.dispatchOffer.findFirst({
        where: {
          bookingId,
          providerId: booking.providerId,
          status: DispatchOfferStatus.ACCEPTED,
        },
        select: { id: true },
      });

      if (acceptedOffer) {
        await tx.dispatchOffer.update({
          where: { id: acceptedOffer.id },
          data: {
            status: DispatchOfferStatus.SKIPPED,
            respondedAt: now,
          },
        });
      }

      const reverted = await tx.booking.updateMany({
        where: {
          id: bookingId,
          status: BookingStatus.CONFIRMED,
          type: BookingType.INSTANT,
        },
        data: {
          status: BookingStatus.PENDING,
          acceptedAt: null,
          dispatchWindowStartedAt: now,
          dispatchSkipCount: { increment: 1 },
        },
      });
      if (reverted.count !== 1) {
        throw new ConflictException('Sifariş artıq dəyişib');
      }

      await tx.notification.create({
        data: {
          userId: booking.providerId,
          type: NotificationType.BOOKING_CANCELLED,
          title: 'Müştəri başqa xidmət verən axtarır',
          body: `«${booking.service.title}» sifarişi üçün müştəri sizin qiymətinizi qəbul etmədi.`,
          data: { bookingId, skippedProvider: true },
        },
      });

      return {
        skippedProviderId: booking.providerId,
        offerId: acceptedOffer?.id ?? null,
        serviceTitle: booking.service.title,
        customerId: booking.customerId,
      };
    });

    this.channels?.deliverAfterInApp({
      userId: result.skippedProviderId,
      title: 'Müştəri başqa xidmət verən axtarır',
      body: `«${result.serviceTitle}» sifarişi üçün müştəri sizin qiymətinizi qəbul etmədi.`,
      type: NotificationType.BOOKING_CANCELLED,
      data: { bookingId, skippedProvider: true },
      serviceTitle: result.serviceTitle,
    });

    if (result.offerId) {
      this.emitOfferResult(result.skippedProviderId, {
        offerId: result.offerId,
        bookingId,
        status: 'SKIPPED',
        providerId: result.skippedProviderId,
      });
      this.metrics.incDispatchOffer('cancelled');
    }

    this.realtime?.emitBookingStatus(
      {
        bookingId,
        status: BookingStatus.PENDING,
        timestamp: now.toISOString(),
      },
      [result.customerId, result.skippedProviderId],
    );

    await this.releaseProviderIfBusy(result.skippedProviderId);

    this.logger.log(
      `Customer skip provider=${result.skippedProviderId} booking=${bookingId}`,
    );

    await this.startForBooking(bookingId);
  }

  /**
   * Axtarış pəncərəsi bitdi — hələ PENDING-dirsə auto-cancel.
   */
  async handleSearchWindowEnd(data: SearchWindowJobData): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: data.bookingId },
      select: {
        id: true,
        customerId: true,
        status: true,
        type: true,
      },
    });
    if (!booking) return;
    if (booking.type !== BookingType.INSTANT) return;
    if (booking.status !== BookingStatus.PENDING) return;

    await this.failDispatch(
      booking.id,
      booking.customerId,
      'Uyğun icraçı tapılmadı',
    );
  }

  /**
   * Axtarış pəncərəsi içində yeni ONLINE xidmət verənlərə təklif.
   */
  async handleRediscovery(data: RediscoveryJobData): Promise<void> {
    await this.offerNext(data.bookingId);
  }

  /**
   * İmtina cooldown bitəndə — eyni xidmət verənə yenidən təklif (pəncərə açıqdursa).
   */
  async handleDeclineReoffer(data: DeclineReofferJobData): Promise<void> {
    this.logger.log(
      `Decline-reoffer işə düşdü: booking=${data.bookingId} provider=${data.providerId}`,
    );
    await this.offerNext(data.bookingId);
  }

  /**
   * Xidmət verən ONLINE olduqda (sayta giriş / əl ilə / WS presence / BUSY bitməsi)
   * açıq axtarış pəncərəsindəki eyni xidmət növü üzrə təcili sifarişlərə dərhal təklif göndər.
   * Fire-and-forget — çağıran API cavabını gözləməsin.
   */
  notifyProviderOnline(providerId: string): void {
    void this.offerOpenInstantBookingsToProvider(providerId).catch((err) => {
      this.logger.warn(
        `Provider ONLINE rediscovery: ${providerId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    });
  }

  /**
   * Provider BUSY → ONLINE (sifariş bitəndə / ləğv).
   */
  async releaseProviderIfBusy(providerId: string): Promise<void> {
    const result = await this.prisma.providerProfile.updateMany({
      where: {
        userId: providerId,
        availability: ProviderAvailability.BUSY,
      },
      data: { availability: ProviderAvailability.ONLINE },
    });
    if (result.count > 0) {
      this.notifyProviderOnline(providerId);
    }
  }

  /**
   * Yeni ONLINE xidmət verənə uyğun açıq INSTANT sifarişləri təklif et.
   */
  private async offerOpenInstantBookingsToProvider(
    providerId: string,
  ): Promise<void> {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId: providerId },
      select: { availability: true, isVerified: true },
    });
    if (
      !profile?.isVerified ||
      profile.availability !== ProviderAvailability.ONLINE
    ) {
      return;
    }

    const services = await this.prisma.service.findMany({
      where: {
        providerId,
        status: ServiceStatus.ACTIVE,
      },
      select: { categoryId: true, title: true },
    });
    if (services.length === 0) return;

    const servicePairs = [
      ...new Map(
        services.map((s) => [`${s.categoryId}\0${s.title}`, s] as const),
      ).values(),
    ];

    const now = new Date();
    const createdAfter = new Date(now.getTime() - this.searchWindowSec() * 1000);

    const openBookings = await this.prisma.booking.findMany({
      where: {
        type: BookingType.INSTANT,
        status: BookingStatus.PENDING,
        customerId: { not: providerId },
        OR: [
          { dispatchWindowStartedAt: { gte: createdAfter } },
          { dispatchWindowStartedAt: null, createdAt: { gte: createdAfter } },
        ],
        service: {
          OR: servicePairs.map((s) => ({
            categoryId: s.categoryId,
            title: s.title,
          })),
        },
        // PENDING təklifi olmayanlar — imtina cooldown-u bitənlər də yenidən uyğundur
        dispatchOffers: {
          none: {
            providerId,
            status: DispatchOfferStatus.PENDING,
          },
        },
      },
      select: { id: true },
      take: 50,
      orderBy: { createdAt: 'asc' },
    });

    if (openBookings.length === 0) return;

    this.logger.debug(
      `Provider ONLINE → ${openBookings.length} açıq ani sifariş: ${providerId}`,
    );

    for (const booking of openBookings) {
      await this.offerNext(booking.id);
    }
  }

  /**
   * Xidmət növü + şəhər üzrə bütün ONLINE uyğun xidmət verənlərə fan-out.
   * Tək təklif timeout yoxdur — təklif axtarış pəncərəsi bitənə qədər qalır.
   */
  private async offerNext(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: {
          select: { id: true, title: true, categoryId: true, location: true },
        },
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!booking) return;
    if (booking.type !== BookingType.INSTANT) return;
    if (booking.status !== BookingStatus.PENDING) return;
    const prefs = this.hydratePrefs(bookingId, booking.dispatchPrefs);
    const serviceCityRaw =
      prefs?.serviceCity?.trim() || booking.service.location?.trim() || '';
    if (!serviceCityRaw) {
      await this.failDispatch(
        booking.id,
        booking.customerId,
        'Xidmət ərazisi təyin olunmayıb',
      );
      return;
    }

    const serviceCity = resolveServiceCity(serviceCityRaw);
    const locationLabels = locationLabelsForCity(serviceCity);
    const now = new Date();
    const windowStart = dispatchSearchWindowStart(
      booking.createdAt,
      booking.dispatchWindowStartedAt,
    );
    const searchOpen = isDispatchSearchWindowOpen(
      windowStart,
      now,
      this.searchWindowSec(),
    );

    if (!searchOpen) {
      await this.failDispatch(
        booking.id,
        booking.customerId,
        'Uyğun icraçı tapılmadı',
      );
      return;
    }

    const active = await this.prisma.dispatchOffer.count({
      where: {
        bookingId,
        status: DispatchOfferStatus.PENDING,
        expiresAt: { gt: now },
      },
    });
    if (active >= DISPATCH.MAX_ACTIVE_OFFERS) {
      await this.queue.scheduleRediscovery(
        { bookingId },
        this.rediscoveryIntervalSec() * 1000,
      );
      return;
    }

    const previousOffers = await this.prisma.dispatchOffer.findMany({
      where: { bookingId },
      select: { providerId: true, status: true, respondedAt: true },
    });
    const exclude = providersExcludedFromRedispatch(previousOffers, {
      now,
      declineReofferCooldownSec: this.declineReofferCooldownSec(),
    });
    exclude.add(booking.customerId);

    const candidates = await this.findServiceTypeCandidates({
      categoryId: booking.service.categoryId,
      serviceTitle: booking.service.title,
      locationLabels,
      destLat: booking.destLat,
      destLng: booking.destLng,
      minPrice: prefs?.minPrice,
      maxPrice: prefs?.maxPrice,
      minRating: prefs?.minRating,
    });

    const ranked = rankDispatchCandidates(candidates);
    const available = ranked.filter((c) => !exclude.has(c.providerId));
    const expiresAt = this.searchWindowExpiresAt(windowStart);

    if (available.length === 0) {
      await this.queue.scheduleRediscovery(
        { bookingId },
        this.rediscoveryIntervalSec() * 1000,
      );
      this.logger.debug(
        `Dispatch gözləyir (axtarış pəncərəsi açıq): booking=${bookingId} active=${active}`,
      );
      return;
    }

    const slots = DISPATCH.MAX_ACTIVE_OFFERS - active;
    const batch = available.slice(0, slots);

    for (const next of batch) {
      await this.createAndEmitOffer({
        booking: {
          id: booking.id,
          address: booking.address,
          destLat: booking.destLat,
          destLng: booking.destLng,
          scheduledAt: booking.scheduledAt,
          serviceTitle: booking.service.title,
        },
        candidate: next,
        expiresAt,
      });
    }

    await this.queue.scheduleRediscovery(
      { bookingId },
      this.rediscoveryIntervalSec() * 1000,
    );
  }

  /**
   * Eyni xidmət növü (kateqoriya + başlıq) + şəhər + ONLINE — radius məhdudiyyəti yox.
   */
  private async findServiceTypeCandidates(input: {
    categoryId: string;
    serviceTitle: string;
    locationLabels: readonly string[];
    destLat: number | null;
    destLng: number | null;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
  }): Promise<DispatchCandidate[]> {
    if (input.locationLabels.length === 0) return [];

    const priceFilter: { gte?: number; lte?: number } = {};
    if (input.minPrice !== undefined) priceFilter.gte = input.minPrice;
    if (input.maxPrice !== undefined) priceFilter.lte = input.maxPrice;

    const services = await this.prisma.service.findMany({
      where: {
        categoryId: input.categoryId,
        title: input.serviceTitle,
        status: ServiceStatus.ACTIVE,
        location: { in: [...input.locationLabels] },
        ...(Object.keys(priceFilter).length > 0 ? { price: priceFilter } : {}),
        provider: {
          deletedAt: null,
          providerProfile: {
            isVerified: true,
            availability: ProviderAvailability.ONLINE,
            ...(input.minRating !== undefined
              ? { rating: { gte: input.minRating } }
              : {}),
          },
        },
      },
      take: DISPATCH.MAX_CANDIDATES,
      select: {
        providerId: true,
        provider: {
          select: {
            providerProfile: {
              select: {
                rating: true,
                lastLat: true,
                lastLng: true,
              },
            },
          },
        },
      },
    });

    const byProvider = new Map<string, DispatchCandidate>();
    for (const service of services) {
      if (byProvider.has(service.providerId)) continue;
      const profile = service.provider.providerProfile;
      const rating = profile?.rating ?? 0;
      let distanceM = Number.POSITIVE_INFINITY;
      if (
        input.destLat != null &&
        input.destLng != null &&
        isValidCoordinates(input.destLat, input.destLng) &&
        profile?.lastLat != null &&
        profile?.lastLng != null &&
        isValidCoordinates(profile.lastLat, profile.lastLng)
      ) {
        distanceM = haversineDistanceMeters(
          { lat: input.destLat, lng: input.destLng },
          { lat: profile.lastLat, lng: profile.lastLng },
        );
      }
      byProvider.set(service.providerId, {
        providerId: service.providerId,
        distanceM,
        rating,
      });
    }

    return [...byProvider.values()];
  }

  private async createAndEmitOffer(input: {
    booking: {
      id: string;
      address: string | null;
      destLat: number | null;
      destLng: number | null;
      scheduledAt: Date;
      serviceTitle: string;
    };
    candidate: DispatchCandidate;
    expiresAt: Date;
  }): Promise<void> {
    const { booking, candidate, expiresAt } = input;
    const score = computeDispatchScore(candidate.distanceM, candidate.rating);

    const existingPending = await this.prisma.dispatchOffer.findFirst({
      where: {
        bookingId: booking.id,
        providerId: candidate.providerId,
        status: DispatchOfferStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (existingPending) return;

    let offer;
    try {
      offer = await this.prisma.dispatchOffer.create({
        data: {
          bookingId: booking.id,
          providerId: candidate.providerId,
          status: DispatchOfferStatus.PENDING,
          distanceM: Number.isFinite(candidate.distanceM)
            ? candidate.distanceM
            : null,
          score,
          expiresAt,
        },
        include: offerInclude,
      });
    } catch (error) {
      // Parallel decline-reoffer / rediscovery — artıq PENDING yaradıbsa keç
      const again = await this.prisma.dispatchOffer.findFirst({
        where: {
          bookingId: booking.id,
          providerId: candidate.providerId,
          status: DispatchOfferStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      if (again) return;
      throw error;
    }

    const offerNotification = await this.prisma.notification.create({
      data: {
        userId: candidate.providerId,
        type: NotificationType.BOOKING_CREATED,
        title: 'Təcili sifariş təklifi',
        body: `«${booking.serviceTitle}» üzrə təcili sifariş daxil olub.`,
        data: {
          bookingId: booking.id,
          offerId: offer.id,
          dispatch: true,
        },
      },
    });
    this.channels?.deliverAfterInApp({
      userId: candidate.providerId,
      notificationId: offerNotification.id,
      title: 'Təcili sifariş təklifi',
      body: `«${booking.serviceTitle}» üzrə təcili sifariş daxil olub.`,
      type: NotificationType.BOOKING_CREATED,
      data: { bookingId: booking.id, offerId: offer.id, dispatch: true },
      serviceTitle: booking.serviceTitle,
    });

    const redactedOffer = redactBookingPiiForOffer({
      address: booking.address,
      destLat: booking.destLat,
      destLng: booking.destLng,
      originLat: null,
      originLng: null,
      notes: null,
      customerFirstName: '',
      customerLastName: '',
    });

    const payload: DispatchOfferPayload = {
      offerId: offer.id,
      bookingId: booking.id,
      serviceTitle: booking.serviceTitle,
      address: redactedOffer.address,
      destLat: redactedOffer.destLat,
      destLng: redactedOffer.destLng,
      distanceM: Number.isFinite(candidate.distanceM)
        ? candidate.distanceM
        : null,
      expiresAt: expiresAt.toISOString(),
      scheduledAt: booking.scheduledAt.toISOString(),
    };

    this.realtime?.emitToRoom(
      providerRoom(candidate.providerId),
      REALTIME_EVENTS.DISPATCH_OFFER,
      payload,
    );
    this.metrics.incDispatchOffer('created');

    this.logger.log(
      `Dispatch offer → provider=${candidate.providerId} booking=${booking.id} dist=${Number.isFinite(candidate.distanceM) ? Math.round(candidate.distanceM) : '?'}m`,
    );
  }

  /**
   * Namizəd tükəndi / mümkün deyil — auto-cancel + müştəriyə bildiriş.
   */
  private async failDispatch(
    bookingId: string,
    customerId: string,
    reason: string,
  ): Promise<void> {
    const now = new Date();
    const updated = await this.prisma.booking.updateMany({
      where: {
        id: bookingId,
        status: BookingStatus.PENDING,
        type: BookingType.INSTANT,
      },
      data: {
        status: BookingStatus.CANCELLED,
        cancelReason: reason,
        cancelledBy: 'SYSTEM',
        cancelledAt: now,
      },
    });

    if (updated.count !== 1) return;

    await this.queue.cancelSearchWindowEnd(bookingId);
    await this.queue.cancelRediscovery(bookingId);
    await this.queue.cancelDeclineReoffers(bookingId);

    await this.prisma.dispatchOffer.updateMany({
      where: { bookingId, status: DispatchOfferStatus.PENDING },
      data: {
        status: DispatchOfferStatus.CANCELLED,
        respondedAt: now,
      },
    });

    this.clearPrefs(bookingId);

    const failNotification = await this.prisma.notification.create({
      data: {
        userId: customerId,
        type: NotificationType.BOOKING_CANCELLED,
        title: 'Təcili sifariş tapılmadı',
        body: `${reason}. Yeni sifariş yarada və ya daha sonra yenidən cəhd edə bilərsiniz.`,
        data: { bookingId, dispatchFailed: true },
      },
    });
    this.channels?.deliverAfterInApp({
      userId: customerId,
      notificationId: failNotification.id,
      title: 'Təcili sifariş tapılmadı',
      body: `${reason}. Yeni sifariş yarada və ya daha sonra yenidən cəhd edə bilərsiniz.`,
      type: NotificationType.BOOKING_CANCELLED,
      data: { bookingId, dispatchFailed: true },
    });

    this.realtime?.emitBookingStatus({
      bookingId,
      status: BookingStatus.CANCELLED,
      timestamp: now.toISOString(),
    }, [customerId]);

    this.logger.log(`Dispatch failed booking=${bookingId}: ${reason}`);
  }

  private async safeSendBookingMail(input: {
    to: string;
    event: Parameters<typeof buildBookingMailContent>[0]['event'];
    serviceTitle: string;
    orderNumber?: string;
    bookingId?: string;
  }) {
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

  private emitOfferResult(
    providerId: string,
    payload: DispatchOfferResultPayload,
  ): void {
    this.realtime?.emitToRoom(
      providerRoom(providerId),
      REALTIME_EVENTS.DISPATCH_OFFER_RESULT,
      payload,
    );
  }

  private mapOffer(
    offer: {
      id: string;
      bookingId: string;
      providerId: string;
      status: string;
      distanceM: number | null;
      score: number | null;
      expiresAt: Date;
      createdAt: Date;
      respondedAt: Date | null;
      booking?: {
        id: string;
        address: string | null;
        destLat: number | null;
        destLng: number | null;
        scheduledAt: Date;
        notes: string | null;
        totalPrice: { toNumber?: () => number } | number | { toString(): string };
        service: { title: string };
        customer: { firstName: string; lastName: string };
      };
    },
  ) {
    const price = offer.booking?.totalPrice;
    let totalPrice = 0;
    if (typeof price === 'number') {
      totalPrice = price;
    } else if (price && typeof price === 'object' && 'toNumber' in price) {
      const maybe = (price as { toNumber?: () => number }).toNumber;
      totalPrice = typeof maybe === 'function' ? maybe.call(price) : Number(String(price));
    } else if (price != null) {
      totalPrice = Number(String(price));
    }

    const pending = offer.status === DispatchOfferStatus.PENDING;
    const redacted =
      pending && offer.booking
        ? redactBookingPiiForOffer({
            address: offer.booking.address,
            destLat: offer.booking.destLat,
            destLng: offer.booking.destLng,
            originLat: null,
            originLng: null,
            notes: offer.booking.notes,
            customerFirstName: offer.booking.customer.firstName,
            customerLastName: offer.booking.customer.lastName,
          })
        : null;

    return {
      id: offer.id,
      bookingId: offer.bookingId,
      providerId: offer.providerId,
      status: offer.status,
      distanceM: offer.distanceM,
      score: offer.score,
      expiresAt: offer.expiresAt.toISOString(),
      createdAt: offer.createdAt.toISOString(),
      respondedAt: offer.respondedAt?.toISOString() ?? null,
      booking: offer.booking
        ? {
            id: offer.booking.id,
            serviceTitle: offer.booking.service.title,
            address: redacted?.address ?? offer.booking.address,
            destLat: redacted?.destLat ?? offer.booking.destLat,
            destLng: redacted?.destLng ?? offer.booking.destLng,
            scheduledAt: offer.booking.scheduledAt.toISOString(),
            notes: redacted ? null : offer.booking.notes,
            totalPrice,
            customerName: redacted
              ? redacted.customerName
              : `${offer.booking.customer.firstName} ${offer.booking.customer.lastName}`,
          }
        : undefined,
    };
  }
}
