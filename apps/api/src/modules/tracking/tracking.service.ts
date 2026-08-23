import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  LOCATION_GEO_SYNC_INTERVAL_MS,
  LOCATION_PING_SAMPLE_INTERVAL_MS,
  LOCATION_PUSH_MIN_INTERVAL_MS,
  estimateEtaSeconds,
  isTrackableBookingStatus,
  isValidCoordinates,
  isValidHeading,
  shouldAcceptLocationPush,
  shouldSampleLocationPing,
  type LocationPushPayload,
  type LocationUpdatePayload,
  type LocationPingSummary,
} from '@xidmetal/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { GeoService } from '../geo/geo.service';
import { RealtimeService } from '../realtime/realtime.service';
import { canPushLocation } from '../realtime/realtime-auth';
import type { WsAuthenticatedUser } from '../realtime/realtime-auth';
import { EtaService } from '../geo/eta.service';
import { isBookingParticipant } from '../bookings/booking-access';

type TrackableBooking = {
  id: string;
  status: string;
  type: string;
  acceptedAt: Date | null;
  providerId: string;
  customerId: string;
  destLat: number | null;
  destLng: number | null;
};

const BOOKING_CACHE_TTL_MS = 2_000;

/**
 * Canlı izləmə — hot path: validate → throttle → WS emit.
 * DB (geo/PostGIS/LocationPing) və Directions ETA arxa planda, throttle ilə.
 */
@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);
  /** Fallback when Redis yoxdur / xəta */
  private readonly lastPushAt = new Map<string, number>();
  private readonly lastSampleAt = new Map<string, number>();
  private readonly lastGeoSyncAt = new Map<string, number>();
  private readonly bookingCache = new Map<
    string,
    { at: number; booking: TrackableBooking }
  >();

  constructor(
    private prisma: PrismaService,
    private geoService: GeoService,
    private realtime: RealtimeService,
    private etaService: EtaService,
    private redis: RedisService,
  ) {}

  async handleLocationPush(
    user: WsAuthenticatedUser,
    payload: LocationPushPayload,
  ): Promise<{ ok: true; sampled: boolean } | { ok: false; reason: string }> {
    if (!payload?.bookingId || typeof payload.bookingId !== 'string') {
      return { ok: false, reason: 'bookingId tələb olunur' };
    }
    if (!isValidCoordinates(payload.lat, payload.lng)) {
      return { ok: false, reason: 'Koordinatlar etibarsızdır' };
    }
    if (!isValidHeading(payload.heading)) {
      return { ok: false, reason: 'İstiqamət etibarsızdır' };
    }
    if (
      payload.speed != null &&
      (!Number.isFinite(payload.speed) || payload.speed < 0 || payload.speed > 100)
    ) {
      return { ok: false, reason: 'Sürət etibarsızdır' };
    }

    const booking = await this.getTrackableBooking(payload.bookingId);
    if (!booking) {
      return { ok: false, reason: 'Sifariş tapılmadı' };
    }

    if (!canPushLocation(user, booking)) {
      return { ok: false, reason: 'Lokasiya göndərmək icazəniz yoxdur' };
    }

    if (!isTrackableBookingStatus(booking.status as BookingStatus)) {
      return { ok: false, reason: 'Bu statusda canlı izləmə aktiv deyil' };
    }

    const now = Date.now();
    const throttleKey = `${booking.id}:${user.id}`;
    const accepted = await this.acceptPushThrottle(throttleKey, now);
    if (!accepted) {
      return { ok: false, reason: 'Çox tez-tez göndərilir' };
    }

    // Hot path ETA: cache (yol) → haversine fallback. Directions arxa planda dəqiqləşir.
    let etaSeconds: number | null = null;
    let distanceMeters: number | null = null;
    let routePolyline: string | null = null;
    if (booking.destLat != null && booking.destLng != null) {
      const from = { lat: payload.lat, lng: payload.lng };
      const to = { lat: booking.destLat, lng: booking.destLng };
      const cached = this.etaService.peekCached(from, to);
      if (cached) {
        etaSeconds = cached.etaSeconds;
        distanceMeters = cached.distanceMeters;
        routePolyline = cached.routePolyline ?? null;
      } else {
        const fast = estimateEtaSeconds(from, to);
        etaSeconds = fast.etaSeconds;
        distanceMeters = fast.distanceMeters;
      }
    }

    const recordedAt = new Date();
    const update: LocationUpdatePayload = {
      bookingId: booking.id,
      lat: payload.lat,
      lng: payload.lng,
      heading: payload.heading ?? null,
      speed: payload.speed ?? null,
      etaSeconds,
      distanceMeters,
      routePolyline,
      recordedAt: recordedAt.toISOString(),
    };
    this.realtime.emitLocationUpdate(booking.id, update);

    // DB + Mapbox — await yox (event loop / connection pool azad qalır)
    void this.persistLocationSideEffects({
      userId: user.id,
      booking,
      payload,
      recordedAt,
      now,
      update,
    });

    return { ok: true, sampled: false };
  }

  async getLocationPings(
    bookingId: string,
    userId: string,
    role: string,
    limit = 100,
  ): Promise<LocationPingSummary[]> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        customerId: true,
        providerId: true,
        type: true,
        status: true,
        acceptedAt: true,
      },
    });
    if (!booking) {
      throw new NotFoundException('Sifariş tapılmadı');
    }

    const isParticipant = isBookingParticipant(userId, role, booking);
    if (!isParticipant) {
      throw new ForbiddenException('Bu sifarişə baxmaq icazəniz yoxdur');
    }

    const take = Math.min(Math.max(limit, 1), 500);
    const rows = await this.prisma.locationPing.findMany({
      where: { bookingId },
      orderBy: { recordedAt: 'desc' },
      take,
    });

    return rows.map((row) => ({
      id: row.id,
      bookingId: row.bookingId,
      lat: row.lat,
      lng: row.lng,
      heading: row.heading,
      speed: row.speed,
      recordedAt: row.recordedAt.toISOString(),
    }));
  }

  async assertCanSubscribe(
    user: WsAuthenticatedUser,
    bookingId: string,
  ): Promise<{ customerId: string; providerId: string }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        customerId: true,
        providerId: true,
        type: true,
        acceptedAt: true,
      },
    });
    if (!booking) {
      throw new NotFoundException('Sifariş tapılmadı');
    }
    const { canJoinBookingRoom } = await import('../realtime/realtime-auth');
    if (!canJoinBookingRoom(user, booking)) {
      throw new ForbiddenException('Bu sifariş otağına qoşulmaq icazəniz yoxdur');
    }
    return booking;
  }

  /** Status dəyişəndə qısa cache təmizlə */
  invalidateBookingCache(bookingId: string): void {
    this.bookingCache.delete(bookingId);
    void this.redis.del(`track:booking:${bookingId}`);
  }

  private async getTrackableBooking(
    bookingId: string,
  ): Promise<TrackableBooking | null> {
    const mem = this.bookingCache.get(bookingId);
    if (mem && Date.now() - mem.at < BOOKING_CACHE_TTL_MS) {
      return mem.booking;
    }

    const redisKey = `track:booking:${bookingId}`;
    const cached = await this.redis.get(redisKey);
    if (cached) {
      try {
        const booking = JSON.parse(cached) as TrackableBooking;
        this.bookingCache.set(bookingId, { at: Date.now(), booking });
        return booking;
      } catch {
        /* ignore */
      }
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        type: true,
        acceptedAt: true,
        providerId: true,
        customerId: true,
        destLat: true,
        destLng: true,
      },
    });
    if (!booking) return null;

    this.bookingCache.set(bookingId, { at: Date.now(), booking });
    void this.redis.setPx(redisKey, JSON.stringify(booking), BOOKING_CACHE_TTL_MS);
    return booking;
  }

  private async acceptPushThrottle(
    throttleKey: string,
    now: number,
  ): Promise<boolean> {
    const redisKey = `track:push:${throttleKey}`;
    const nx = await this.redis.setNxPx(
      redisKey,
      '1',
      LOCATION_PUSH_MIN_INTERVAL_MS,
    );
    if (nx === true) return true;
    if (nx === false) return false;

    const lastPush = this.lastPushAt.get(throttleKey);
    if (!shouldAcceptLocationPush(lastPush, now)) {
      return false;
    }
    this.lastPushAt.set(throttleKey, now);
    return true;
  }

  private async shouldRunGeoSync(userId: string, now: number): Promise<boolean> {
    const nx = await this.redis.setNxPx(
      `track:geo:${userId}`,
      '1',
      LOCATION_GEO_SYNC_INTERVAL_MS,
    );
    if (nx === true) return true;
    if (nx === false) return false;

    const last = this.lastGeoSyncAt.get(userId);
    if (last != null && now - last < LOCATION_GEO_SYNC_INTERVAL_MS) {
      return false;
    }
    this.lastGeoSyncAt.set(userId, now);
    return true;
  }

  private async shouldSamplePing(
    bookingId: string,
    now: number,
  ): Promise<boolean> {
    const nx = await this.redis.setNxPx(
      `track:sample:${bookingId}`,
      '1',
      LOCATION_PING_SAMPLE_INTERVAL_MS,
    );
    if (nx === true) return true;
    if (nx === false) return false;

    const lastSample = this.lastSampleAt.get(bookingId);
    if (!shouldSampleLocationPing(lastSample, now)) {
      return false;
    }
    this.lastSampleAt.set(bookingId, now);
    return true;
  }

  private async persistLocationSideEffects(params: {
    userId: string;
    booking: TrackableBooking;
    payload: LocationPushPayload;
    recordedAt: Date;
    now: number;
    update: LocationUpdatePayload;
  }): Promise<void> {
    const { userId, booking, payload, recordedAt, now, update } = params;

    try {
      if (await this.shouldRunGeoSync(userId, now)) {
        await this.geoService.syncTrackingCoordinates(userId, {
          lat: payload.lat,
          lng: payload.lng,
          heading: payload.heading ?? null,
        });
      }
    } catch (error) {
      this.logger.warn(
        `Provider location sync: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    try {
      if (await this.shouldSamplePing(booking.id, now)) {
        await this.prisma.locationPing.create({
          data: {
            bookingId: booking.id,
            lat: payload.lat,
            lng: payload.lng,
            heading: payload.heading ?? null,
            speed: payload.speed ?? null,
            recordedAt,
          },
        });
      }
    } catch (error) {
      this.logger.warn(
        `LocationPing yazılmadı: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (booking.destLat == null || booking.destLng == null) return;

    try {
      const refined = await this.etaService.estimate(
        { lat: payload.lat, lng: payload.lng },
        { lat: booking.destLat, lng: booking.destLng },
      );
      if (refined.source === 'haversine') return;

      const changed =
        refined.etaSeconds !== update.etaSeconds ||
        refined.distanceMeters !== update.distanceMeters ||
        (refined.routePolyline ?? null) !== (update.routePolyline ?? null);

      if (changed) {
        this.realtime.emitLocationUpdate(booking.id, {
          ...update,
          etaSeconds: refined.etaSeconds,
          distanceMeters: refined.distanceMeters,
          routePolyline: refined.routePolyline ?? null,
        });
      }
    } catch (error) {
      this.logger.debug(
        `ETA refine: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
