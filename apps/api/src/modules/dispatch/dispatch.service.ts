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
  providerRoom,
  rankDispatchCandidates,
  type DispatchCandidate,
  type DispatchOfferPayload,
  type DispatchOfferResultPayload,
} from '@xidmetal/shared';
import { ServiceStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { GeoService } from '../geo/geo.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationChannelsService } from '../../common/notifications/notification-channels.service';
import {
  DispatchQueueService,
  type OfferTimeoutJobData,
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
}

@Injectable()
export class DispatchService implements OnModuleInit {
  private readonly logger = new Logger(DispatchService.name);
  /** Booking-ə bağlı müvəqqəti dispatch filtrləri (restart-da itir; optional) */
  private readonly dispatchPrefs = new Map<string, DispatchStartPrefs>();

  constructor(
    private prisma: PrismaService,
    private geo: GeoService,
    private queue: DispatchQueueService,
    private config: ConfigService,
    private metrics: MetricsService,
    @Optional() private realtime?: RealtimeService,
    @Optional() private channels?: NotificationChannelsService,
  ) {}

  onModuleInit(): void {
    this.queue.setTimeoutHandler((data) => this.handleOfferTimeout(data));
  }

  private radiusMeters(): number {
    const raw = this.config.get<string>('DISPATCH_RADIUS_M')?.trim();
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DISPATCH.RADIUS_M;
  }

  private offerTimeoutSec(): number {
    const raw = this.config.get<string>('DISPATCH_OFFER_TIMEOUT_SEC')?.trim();
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : DISPATCH.OFFER_TIMEOUT_SEC;
  }

  private clearPrefs(bookingId: string): void {
    this.dispatchPrefs.delete(bookingId);
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
      if (Object.keys(cleaned).length > 0) {
        this.dispatchPrefs.set(bookingId, cleaned);
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

    if (booking.destLat == null || booking.destLng == null) {
      await this.failDispatch(
        booking.id,
        booking.customerId,
        'Ani sifariş üçün təyinat koordinatları yoxdur',
      );
      return;
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
              service: { select: { categoryId: true, title: true } },
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

      const matchingService =
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
          body: `«${matchingService.title}» üçün ani sifarişiniz qəbul edildi.`,
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

    await this.queue.cancelOfferTimeout(offerId);

    this.channels?.deliverAfterInApp({
      userId: result.booking.customerId,
      title: 'Sifariş təsdiqləndi',
      body: `«${result.booking.service.title}» üçün ani sifarişiniz qəbul edildi.`,
      type: NotificationType.BOOKING_CONFIRMED,
      data: { bookingId: result.booking.id },
      serviceTitle: result.booking.service.title,
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
      await this.queue.cancelOfferTimeout(other.id);
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
    });

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

    await this.queue.cancelOfferTimeout(offerId);

    this.emitOfferResult(providerId, {
      offerId,
      bookingId: offer.bookingId,
      status: 'REJECTED',
      providerId,
    });
    this.metrics.incDispatchOffer('rejected');

    // Növbəti namizəd
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
   * BullMQ / fallback timeout — PENDING offer → EXPIRED, sonra növbəti.
   */
  async handleOfferTimeout(data: OfferTimeoutJobData): Promise<void> {
    const now = new Date();
    const updated = await this.prisma.dispatchOffer.updateMany({
      where: {
        id: data.offerId,
        status: DispatchOfferStatus.PENDING,
      },
      data: {
        status: DispatchOfferStatus.EXPIRED,
        respondedAt: now,
      },
    });

    if (updated.count !== 1) return;

    const offer = await this.prisma.dispatchOffer.findUnique({
      where: { id: data.offerId },
    });
    if (!offer) return;

    this.realtime?.emitToRoom(
      providerRoom(offer.providerId),
      REALTIME_EVENTS.DISPATCH_OFFER_EXPIRED,
      {
        offerId: offer.id,
        bookingId: offer.bookingId,
      },
    );

    this.emitOfferResult(offer.providerId, {
      offerId: offer.id,
      bookingId: offer.bookingId,
      status: 'EXPIRED',
      providerId: offer.providerId,
    });
    this.metrics.incDispatchOffer('expired');

    await this.offerNext(offer.bookingId);
  }

  /**
   * Provider BUSY → ONLINE (sifariş bitəndə / ləğv).
   */
  async releaseProviderIfBusy(providerId: string): Promise<void> {
    await this.prisma.providerProfile.updateMany({
      where: {
        userId: providerId,
        availability: ProviderAvailability.BUSY,
      },
      data: { availability: ProviderAvailability.ONLINE },
    });
  }

  /**
   * Uyğun namizədlərə eyni anda PENDING offer göndərir (fan-out).
   * Aktiv offer qalanda namizəd tükənməsi sifarişi ləğv etmir.
   */
  private async offerNext(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: { select: { id: true, title: true, categoryId: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!booking) return;
    if (booking.type !== BookingType.INSTANT) return;
    if (booking.status !== BookingStatus.PENDING) return;
    if (booking.destLat == null || booking.destLng == null) {
      await this.failDispatch(
        booking.id,
        booking.customerId,
        'Təyinat koordinatları yoxdur',
      );
      return;
    }

    const active = await this.prisma.dispatchOffer.count({
      where: {
        bookingId,
        status: DispatchOfferStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });
    if (active >= DISPATCH.MAX_ACTIVE_OFFERS) return;

    const previousOffers = await this.prisma.dispatchOffer.findMany({
      where: { bookingId },
      select: { providerId: true },
    });
    const exclude = new Set(previousOffers.map((o) => o.providerId));
    exclude.add(booking.customerId);

    const radiusM = this.radiusMeters();
    const nearby = await this.geo.findNearby({
      lat: booking.destLat,
      lng: booking.destLng,
      radiusKm: metersToKm(radiusM),
      categoryId: booking.service.categoryId,
      limit: DISPATCH.MAX_CANDIDATES,
    });

    const prefs = this.dispatchPrefs.get(bookingId);
    const eligibleProviderIds = await this.findEligibleProviderIds({
      providerIds: nearby.items.map((item) => item.userId),
      categoryId: booking.service.categoryId,
      serviceTitle: booking.service.title,
      minPrice: prefs?.minPrice,
      maxPrice: prefs?.maxPrice,
    });

    const candidates: DispatchCandidate[] = nearby.items
      .filter((item) => {
        if (!eligibleProviderIds.has(item.userId)) return false;
        if (
          prefs?.minRating !== undefined &&
          item.rating < prefs.minRating
        ) {
          return false;
        }
        return true;
      })
      .map((item) => ({
        providerId: item.userId,
        distanceM: item.distanceM,
        rating: item.rating,
      }));

    const ranked = rankDispatchCandidates(candidates);
    const available = ranked.filter((c) => !exclude.has(c.providerId));

    if (available.length === 0) {
      if (active === 0) {
        await this.failDispatch(
          booking.id,
          booking.customerId,
          'Uyğun icraçı tapılmadı',
        );
      }
      return;
    }

    const slots = DISPATCH.MAX_ACTIVE_OFFERS - active;
    const batch = available.slice(0, slots);
    const timeoutSec = this.offerTimeoutSec();

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
        timeoutSec,
      });
    }
  }

  private async findEligibleProviderIds(input: {
    providerIds: string[];
    categoryId: string;
    serviceTitle: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<Set<string>> {
    if (input.providerIds.length === 0) return new Set();

    const priceFilter: { gte?: number; lte?: number } = {};
    if (input.minPrice !== undefined) priceFilter.gte = input.minPrice;
    if (input.maxPrice !== undefined) priceFilter.lte = input.maxPrice;

    const services = await this.prisma.service.findMany({
      where: {
        providerId: { in: input.providerIds },
        categoryId: input.categoryId,
        title: input.serviceTitle,
        status: ServiceStatus.ACTIVE,
        ...(Object.keys(priceFilter).length > 0 ? { price: priceFilter } : {}),
      },
      select: { providerId: true },
    });

    return new Set(services.map((s) => s.providerId));
  }

  private async createAndEmitOffer(input: {
    booking: {
      id: string;
      address: string | null;
      destLat: number;
      destLng: number;
      scheduledAt: Date;
      serviceTitle: string;
    };
    candidate: DispatchCandidate;
    timeoutSec: number;
  }): Promise<void> {
    const { booking, candidate, timeoutSec } = input;
    const expiresAt = new Date(Date.now() + timeoutSec * 1000);
    const score = computeDispatchScore(candidate.distanceM, candidate.rating);

    const offer = await this.prisma.dispatchOffer.create({
      data: {
        bookingId: booking.id,
        providerId: candidate.providerId,
        status: DispatchOfferStatus.PENDING,
        distanceM: candidate.distanceM,
        score,
        expiresAt,
      },
      include: offerInclude,
    });

    const offerNotification = await this.prisma.notification.create({
      data: {
        userId: candidate.providerId,
        type: NotificationType.BOOKING_CREATED,
        title: 'Ani sifariş təklifi',
        body: `Yaxınlıqdakı «${booking.serviceTitle}» sifarişi — ${timeoutSec} saniyə ərzində cavab verin.`,
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
      title: 'Ani sifariş təklifi',
      body: `Yaxınlıqdakı «${booking.serviceTitle}» sifarişi — ${timeoutSec} saniyə ərzində cavab verin.`,
      type: NotificationType.BOOKING_CREATED,
      data: { bookingId: booking.id, offerId: offer.id, dispatch: true },
      serviceTitle: booking.serviceTitle,
    });

    await this.queue.scheduleOfferTimeout(
      { offerId: offer.id, bookingId: booking.id },
      timeoutSec * 1000,
    );

    const payload: DispatchOfferPayload = {
      offerId: offer.id,
      bookingId: booking.id,
      serviceTitle: booking.serviceTitle,
      address: booking.address,
      destLat: booking.destLat,
      destLng: booking.destLng,
      distanceM: candidate.distanceM,
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
      `Dispatch offer → provider=${candidate.providerId} booking=${booking.id} dist=${Math.round(candidate.distanceM)}m`,
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
        title: 'Ani sifariş tapılmadı',
        body: `${reason}. Yeni sifariş yarada və ya daha sonra yenidən cəhd edə bilərsiniz.`,
        data: { bookingId, dispatchFailed: true },
      },
    });
    this.channels?.deliverAfterInApp({
      userId: customerId,
      notificationId: failNotification.id,
      title: 'Ani sifariş tapılmadı',
      body: `${reason}. Yeni sifariş yarada və ya daha sonra yenidən cəhd edə bilərsiniz.`,
      type: NotificationType.BOOKING_CANCELLED,
      data: { bookingId, dispatchFailed: true },
    });

    this.realtime?.emitBookingStatus({
      bookingId,
      status: BookingStatus.CANCELLED,
      timestamp: now.toISOString(),
    });

    this.logger.log(`Dispatch failed booking=${bookingId}: ${reason}`);
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
            address: offer.booking.address,
            destLat: offer.booking.destLat,
            destLng: offer.booking.destLng,
            scheduledAt: offer.booking.scheduledAt.toISOString(),
            notes: offer.booking.notes,
            totalPrice,
            customerName: `${offer.booking.customer.firstName} ${offer.booking.customer.lastName}`,
          }
        : undefined,
    };
  }
}

/** meters → km (geo findNearby radiusKm gözləyir) */
function metersToKm(meters: number): number {
  return meters / 1000;
}
