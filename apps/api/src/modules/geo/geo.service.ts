import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { Prisma, ProviderAvailability, ServiceStatus, UserRole } from '@prisma/client';
import {
  haversineDistanceMeters,
  isValidCoordinates,
  isValidHeading,
  kmToMeters,
  locationLabelsForCity,
  isAzerbaijanLocation,
  type NearbyProviderSummary,
} from '@xidmetal/shared';
import { PrismaService } from '../../common/database/prisma.service';
import {
  assertProviderVerified,
  isProviderDutyAvailability,
} from '../../common/provider/assert-provider-verified';
import { StorageService } from '../../common/storage/storage.service';
import { isBookingParticipant } from '../bookings/booking-access';
import { DispatchService } from '../dispatch/dispatch.service';
import { GEOCODER_ADAPTER, type GeocoderAdapter } from './geocoder';
import {
  coarsenPublicCoordinate,
  coarsenPublicDistanceM,
} from './geo-query';
import type {
  NearbyProvidersQueryDto,
  OnlineProvidersCountQueryDto,
  UpdateProviderAvailabilityDto,
  UpdateProviderLocationDto,
} from './dto';

interface NearbyRawRow {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  rating: number;
  review_count: number;
  is_verified: boolean;
  availability: ProviderAvailability;
  last_lat: number;
  last_lng: number;
  location_updated_at: Date | null;
  distance_m: number;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private postgisAvailable: boolean | null = null;

  constructor(
    private prisma: PrismaService,
    @Inject(GEOCODER_ADAPTER) private geocoder: GeocoderAdapter,
    private storageService: StorageService,
    @Optional()
    @Inject(forwardRef(() => DispatchService))
    private dispatch?: DispatchService,
  ) {}

  async geocode(query: string) {
    const q = query.trim();
    if (q.length < 2) {
      throw new BadRequestException('Axtarış ən azı 2 simvol olmalıdır');
    }
    return this.geocoder.geocode(q);
  }

  async reverseGeocode(lat: number, lng: number) {
    this.assertCoords(lat, lng);
    return this.geocoder.reverse(lat, lng);
  }

  /**
   * Directions yalnız sifariş iştirakçısı + booking dest üçün.
   * Təyinat müştəri `to` parametrindən gəlmir — ödənişli API sui-istifadəsi olmasın.
   */
  async assertDrivingRouteDest(
    userId: string,
    role: string,
    bookingId: string,
  ): Promise<{ lat: number; lng: number }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        customerId: true,
        providerId: true,
        type: true,
        acceptedAt: true,
        destLat: true,
        destLng: true,
      },
    });
    if (!booking || !isBookingParticipant(userId, role, booking)) {
      throw new NotFoundException('Sifariş tapılmadı');
    }
    if (booking.destLat == null || booking.destLng == null) {
      throw new BadRequestException('Sifarişin təyinat koordinatı yoxdur');
    }
    this.assertCoords(booking.destLat, booking.destLng);
    return { lat: booking.destLat, lng: booking.destLng };
  }

  async updateMyLocation(userId: string, dto: UpdateProviderLocationDto) {
    this.assertCoords(dto.lat, dto.lng);
    if (!isValidHeading(dto.heading)) {
      throw new BadRequestException('İstiqamət 0…360 aralığında olmalıdır');
    }

    const profile = await this.ensureProviderProfile(userId);
    const now = new Date();
    const previousAvailability = profile.availability;
    const availability = dto.availability ?? profile.availability;

    if (isProviderDutyAvailability(availability)) {
      await assertProviderVerified(this.prisma, userId);
    }

    await this.prisma.providerProfile.update({
      where: { id: profile.id },
      data: {
        lastLat: dto.lat,
        lastLng: dto.lng,
        lastHeading: dto.heading ?? null,
        locationUpdatedAt: now,
        availability,
      },
    });

    await this.syncLastLocationGeography(profile.id, dto.lat, dto.lng);

    if (
      availability === ProviderAvailability.ONLINE &&
      previousAvailability !== ProviderAvailability.ONLINE
    ) {
      this.dispatch?.notifyProviderOnline(userId);
    }

    return {
      availability,
      lastLat: dto.lat,
      lastLng: dto.lng,
      lastHeading: dto.heading ?? null,
      locationUpdatedAt: now.toISOString(),
    };
  }

  /**
   * Canlı izləmə hot-path üçün yüngül sync — verify/availability toxunmur.
   * Hər 3s push əvəzinə TrackingService interval ilə çağırır.
   */
  async syncTrackingCoordinates(
    userId: string,
    coords: { lat: number; lng: number; heading?: number | null },
  ): Promise<void> {
    this.assertCoords(coords.lat, coords.lng);
    if (!isValidHeading(coords.heading)) {
      throw new BadRequestException('İstiqamət 0…360 aralığında olmalıdır');
    }

    const now = new Date();
    try {
      const profile = await this.prisma.providerProfile.update({
        where: { userId },
        data: {
          lastLat: coords.lat,
          lastLng: coords.lng,
          lastHeading: coords.heading ?? null,
          locationUpdatedAt: now,
        },
        select: { id: true },
      });
      await this.syncLastLocationGeography(profile.id, coords.lat, coords.lng);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return;
      }
      throw error;
    }
  }

  async updateMyAvailability(userId: string, dto: UpdateProviderAvailabilityDto) {
    if (isProviderDutyAvailability(dto.availability)) {
      await assertProviderVerified(this.prisma, userId);
    }

    const profile = await this.ensureProviderProfile(userId);
    if (profile.availability === ProviderAvailability.BUSY) {
      throw new BadRequestException(
        'Aktiv sifariş bitənə qədər status dəyişdirilə bilməz',
      );
    }

    const previousAvailability = profile.availability;
    const updated = await this.prisma.providerProfile.update({
      where: { id: profile.id },
      data: { availability: dto.availability },
      select: {
        availability: true,
        lastLat: true,
        lastLng: true,
        lastHeading: true,
        locationUpdatedAt: true,
      },
    });

    if (
      updated.availability === ProviderAvailability.ONLINE &&
      previousAvailability !== ProviderAvailability.ONLINE
    ) {
      this.dispatch?.notifyProviderOnline(userId);
    }

    return {
      availability: updated.availability,
      lastLat: updated.lastLat,
      lastLng: updated.lastLng,
      lastHeading: updated.lastHeading,
      locationUpdatedAt: updated.locationUpdatedAt?.toISOString() ?? null,
    };
  }

  /**
   * Seçilmiş xidmət növü üzrə hazırda ONLINE olan xidmət verənlərin sayı.
   * Təcili sifariş UI-də müştəriyə göstərilir.
   */
  async countOnlineProviders(
    dto: OnlineProvidersCountQueryDto,
  ): Promise<{ count: number }> {
    const priceFilter: { gte?: number; lte?: number } = {};
    if (dto.minPrice !== undefined && Number.isFinite(dto.minPrice)) {
      priceFilter.gte = dto.minPrice;
    }
    if (dto.maxPrice !== undefined && Number.isFinite(dto.maxPrice)) {
      priceFilter.lte = dto.maxPrice;
    }

    const serviceTitle = dto.serviceTitle.trim();
    if (!serviceTitle) {
      return { count: 0 };
    }

    const locationFilter = this.resolveServiceLocationFilter(dto.serviceLocation);

    const count = await this.prisma.providerProfile.count({
      where: {
        isVerified: true,
        availability: ProviderAvailability.ONLINE,
        ...(dto.minRating !== undefined && Number.isFinite(dto.minRating)
          ? { rating: { gte: dto.minRating } }
          : {}),
        user: {
          role: UserRole.PROVIDER,
          isActive: true,
          deletedAt: null,
          services: {
            some: {
              status: ServiceStatus.ACTIVE,
              categoryId: dto.categoryId,
              title: serviceTitle,
              ...(locationFilter ? { location: locationFilter } : {}),
              ...(Object.keys(priceFilter).length > 0
                ? { price: priceFilter }
                : {}),
            },
          },
        },
      },
    });

    return { count };
  }

  private resolveServiceLocationFilter(
    serviceLocation: string | undefined,
  ): { in: string[] } | undefined {
    const trimmed = serviceLocation?.trim();
    if (!trimmed || !isAzerbaijanLocation(trimmed)) {
      return undefined;
    }
    return { in: [...locationLabelsForCity(trimmed)] };
  }

  async findNearby(dto: NearbyProvidersQueryDto): Promise<{
    items: NearbyProviderSummary[];
    engine: 'postgis' | 'haversine';
  }> {
    this.assertCoords(dto.lat, dto.lng);
    const radiusKm = dto.radiusKm ?? 10;
    const limit = dto.limit ?? 20;
    const radiusM = kmToMeters(radiusKm);

    if (await this.isPostgisAvailable()) {
      try {
        const items = await this.findNearbyPostgis({
          lat: dto.lat,
          lng: dto.lng,
          radiusM,
          limit,
          categoryId: dto.categoryId,
        });
        // last_location NULL/stale olanda PostGIS boş qayıda bilər —
        // lastLat/lng ilə haversine ehtiyatı.
        if (items.length > 0) {
          return { items, engine: 'postgis' };
        }
        this.logger.debug(
          'PostGIS yaxınlıq boş — haversine fallback (last_location?)',
        );
      } catch (error) {
        this.logger.warn(
          `PostGIS yaxınlıq uğursuz, haversine fallback: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const items = await this.findNearbyHaversine({
      lat: dto.lat,
      lng: dto.lng,
      radiusM,
      limit,
      categoryId: dto.categoryId,
    });
    return { items, engine: 'haversine' };
  }

  private async findNearbyPostgis(params: {
    lat: number;
    lng: number;
    radiusM: number;
    limit: number;
    categoryId?: string;
  }): Promise<NearbyProviderSummary[]> {
    const { lat, lng, radiusM, limit, categoryId } = params;

    const rows = categoryId
      ? await this.prisma.$queryRaw<NearbyRawRow[]>(Prisma.sql`
          SELECT
            u.id AS user_id,
            u.first_name,
            u.last_name,
            u.avatar_url,
            pp.rating,
            pp.review_count,
            pp.is_verified,
            pp.availability,
            pp.last_lat,
            pp.last_lng,
            pp.location_updated_at,
            ST_Distance(
              pp.last_location,
              ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
            ) AS distance_m
          FROM provider_profiles pp
          INNER JOIN users u ON u.id = pp.user_id
          WHERE u.role = 'PROVIDER'::"UserRole"
            AND u.is_active = true
            AND u.deleted_at IS NULL
            AND pp.is_verified = true
            AND pp.availability = 'ONLINE'::"ProviderAvailability"
            AND pp.last_location IS NOT NULL
            AND ST_DWithin(
              pp.last_location,
              ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
              ${radiusM}
            )
            AND EXISTS (
              SELECT 1 FROM services s
              WHERE s.provider_id = u.id
                AND s.status = 'ACTIVE'::"ServiceStatus"
                AND s.category_id::text = ${categoryId}
            )
          ORDER BY distance_m ASC
          LIMIT ${limit}
        `)
      : await this.prisma.$queryRaw<NearbyRawRow[]>(Prisma.sql`
          SELECT
            u.id AS user_id,
            u.first_name,
            u.last_name,
            u.avatar_url,
            pp.rating,
            pp.review_count,
            pp.is_verified,
            pp.availability,
            pp.last_lat,
            pp.last_lng,
            pp.location_updated_at,
            ST_Distance(
              pp.last_location,
              ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
            ) AS distance_m
          FROM provider_profiles pp
          INNER JOIN users u ON u.id = pp.user_id
          WHERE u.role = 'PROVIDER'::"UserRole"
            AND u.is_active = true
            AND u.deleted_at IS NULL
            AND pp.is_verified = true
            AND pp.availability = 'ONLINE'::"ProviderAvailability"
            AND pp.last_location IS NOT NULL
            AND ST_DWithin(
              pp.last_location,
              ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
              ${radiusM}
            )
            AND EXISTS (
              SELECT 1 FROM services s
              WHERE s.provider_id = u.id
                AND s.status = 'ACTIVE'::"ServiceStatus"
            )
          ORDER BY distance_m ASC
          LIMIT ${limit}
        `);

    return Promise.all(rows.map((row) => this.mapNearbyRow(row)));
  }

  private async findNearbyHaversine(params: {
    lat: number;
    lng: number;
    radiusM: number;
    limit: number;
    categoryId?: string;
  }): Promise<NearbyProviderSummary[]> {
    const { lat, lng, radiusM, limit, categoryId } = params;

    const profiles = await this.prisma.providerProfile.findMany({
      where: {
        isVerified: true,
        availability: ProviderAvailability.ONLINE,
        lastLat: { not: null },
        lastLng: { not: null },
        user: {
          role: UserRole.PROVIDER,
          isActive: true,
          deletedAt: null,
          services: {
            some: {
              status: ServiceStatus.ACTIVE,
              ...(categoryId ? { categoryId } : {}),
            },
          },
        },
      },
      select: {
        rating: true,
        reviewCount: true,
        isVerified: true,
        availability: true,
        lastLat: true,
        lastLng: true,
        locationUpdatedAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      take: 500,
    });

    const origin = { lat, lng };
    const scored: NearbyProviderSummary[] = [];

    for (const p of profiles) {
      if (p.lastLat == null || p.lastLng == null) continue;
      const distanceM = haversineDistanceMeters(origin, {
        lat: p.lastLat,
        lng: p.lastLng,
      });
      if (distanceM > radiusM) continue;
      scored.push({
        userId: p.user.id,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        avatarUrl: await this.storageService.toReadableMediaUrl(p.user.avatarUrl),
        rating: p.rating,
        reviewCount: p.reviewCount,
        isVerified: p.isVerified,
        availability: p.availability as NearbyProviderSummary['availability'],
        lastLat: coarsenPublicCoordinate(p.lastLat),
        lastLng: coarsenPublicCoordinate(p.lastLng),
        locationUpdatedAt: null,
        distanceM: coarsenPublicDistanceM(distanceM),
      });
    }

    scored.sort((a, b) => a.distanceM - b.distanceM);
    return scored.slice(0, limit);
  }

  private async mapNearbyRow(row: NearbyRawRow): Promise<NearbyProviderSummary> {
    return {
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      avatarUrl: await this.storageService.toReadableMediaUrl(row.avatar_url),
      rating: Number(row.rating),
      reviewCount: Number(row.review_count),
      isVerified: row.is_verified,
      availability: row.availability as NearbyProviderSummary['availability'],
      lastLat: coarsenPublicCoordinate(Number(row.last_lat)),
      lastLng: coarsenPublicCoordinate(Number(row.last_lng)),
      locationUpdatedAt: null,
      distanceM: coarsenPublicDistanceM(Number(row.distance_m)),
    };
  }

  private async syncLastLocationGeography(
    profileId: string,
    lat: number,
    lng: number,
  ): Promise<void> {
    if (!(await this.isPostgisAvailable())) return;
    try {
      // Prisma UUID parametrini text kimi bağlaya bilər — ::text müqayisəsi etibarlıdır
      await this.prisma.$executeRaw`
        UPDATE provider_profiles
        SET last_location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        WHERE id::text = ${profileId}
      `;
    } catch (error) {
      this.logger.warn(
        `last_location sync uğursuz: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async isPostgisAvailable(): Promise<boolean> {
    if (this.postgisAvailable !== null) return this.postgisAvailable;
    try {
      const rows = await this.prisma.$queryRaw<{ exists: boolean }[]>`
        SELECT EXISTS(
          SELECT 1 FROM pg_extension WHERE extname = 'postgis'
        ) AS exists
      `;
      this.postgisAvailable = Boolean(rows[0]?.exists);
    } catch {
      this.postgisAvailable = false;
    }
    return this.postgisAvailable;
  }

  private async ensureProviderProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        providerProfile: {
          select: { id: true, availability: true },
        },
      },
    });

    if (!user || user.role !== UserRole.PROVIDER) {
      throw new BadRequestException('Bu əməliyyat yalnız xidmət verənlər üçündür');
    }

    if (user.providerProfile) {
      return user.providerProfile;
    }

    return this.prisma.providerProfile.create({
      data: { userId },
      select: { id: true, availability: true },
    });
  }

  private assertCoords(lat: number, lng: number): void {
    if (!isValidCoordinates(lat, lng)) {
      throw new BadRequestException('Koordinatlar etibarsızdır (lat -90…90, lng -180…180)');
    }
  }
}
