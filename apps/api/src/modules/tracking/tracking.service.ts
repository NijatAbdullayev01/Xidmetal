import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  UserRole,
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
import { GeoService } from '../geo/geo.service';
import { RealtimeService } from '../realtime/realtime.service';
import { canPushLocation } from '../realtime/realtime-auth';
import type { WsAuthenticatedUser } from '../realtime/realtime-auth';
import { EtaService } from './eta.service';

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);
  /** bookingId|userId → last accepted push ms */
  private readonly lastPushAt = new Map<string, number>();
  /** bookingId → last LocationPing sample ms */
  private readonly lastSampleAt = new Map<string, number>();

  constructor(
    private prisma: PrismaService,
    private geoService: GeoService,
    private realtime: RealtimeService,
    private etaService: EtaService,
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

    const booking = await this.prisma.booking.findUnique({
      where: { id: payload.bookingId },
      select: {
        id: true,
        status: true,
        providerId: true,
        customerId: true,
        destLat: true,
        destLng: true,
      },
    });

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
    const lastPush = this.lastPushAt.get(throttleKey);
    if (!shouldAcceptLocationPush(lastPush, now)) {
      return { ok: false, reason: 'Çox tez-tez göndərilir' };
    }
    this.lastPushAt.set(throttleKey, now);

    // Profile + PostGIS sync (best-effort)
    try {
      await this.geoService.updateMyLocation(user.id, {
        lat: payload.lat,
        lng: payload.lng,
        heading: payload.heading ?? undefined,
      });
    } catch (error) {
      this.logger.warn(
        `Provider location sync: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    let etaSeconds: number | null = null;
    let distanceMeters: number | null = null;
    if (booking.destLat != null && booking.destLng != null) {
      const eta = await this.etaService.estimate(
        { lat: payload.lat, lng: payload.lng },
        { lat: booking.destLat, lng: booking.destLng },
      );
      etaSeconds = eta.etaSeconds;
      distanceMeters = eta.distanceMeters;
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
      recordedAt: recordedAt.toISOString(),
    };
    this.realtime.emitLocationUpdate(booking.id, update);

    let sampled = false;
    const lastSample = this.lastSampleAt.get(booking.id);
    if (shouldSampleLocationPing(lastSample, now)) {
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
      this.lastSampleAt.set(booking.id, now);
      sampled = true;
    }

    return { ok: true, sampled };
  }

  async getLocationPings(
    bookingId: string,
    userId: string,
    role: string,
    limit = 100,
  ): Promise<LocationPingSummary[]> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { customerId: true, providerId: true },
    });
    if (!booking) {
      throw new NotFoundException('Sifariş tapılmadı');
    }

    const isParticipant =
      booking.customerId === userId || booking.providerId === userId;
    if (role !== UserRole.ADMIN && !isParticipant) {
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
      select: { customerId: true, providerId: true },
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
}
