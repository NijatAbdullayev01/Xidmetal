import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  BookingType,
  Prisma,
  ProviderAccountType,
  ProviderAvailability,
  ServiceStatus,
} from '@prisma/client';
import {
  ACTIVE_BOOKING_STATUSES,
  INSTANT_CAPACITY_HOLDING_STATUSES,
  SERVICE_TEAMS,
  effectiveServiceCapacity,
  isSlotAtCapacity,
} from '@xidmetal/shared';
import { PrismaService } from '../database/prisma.service';
import { bookingWindowEndMs, countOverlappingWindows } from './booking-overlap';

type DbClient = PrismaService | Prisma.TransactionClient;

const DEFAULT_DURATION_MINUTES = 60;
const ACTIVE_STATUSES = [...ACTIVE_BOOKING_STATUSES] as BookingStatus[];
const INSTANT_HOLDING = [...INSTANT_CAPACITY_HOLDING_STATUSES] as BookingStatus[];

export function capacityHoldingBookingWhere(
  excludeBookingId?: string,
): Prisma.BookingWhereInput {
  return {
    ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    OR: [
      {
        type: BookingType.SCHEDULED,
        status: { in: ACTIVE_STATUSES },
      },
      {
        type: BookingType.INSTANT,
        status: { in: INSTANT_HOLDING },
      },
    ],
  };
}

export interface ServiceCapacityContext {
  serviceId: string;
  providerId: string;
  accountType: ProviderAccountType;
  durationMinutes: number;
  teamCount: number;
  capacity: number;
  teams: Array<{ id: string; name: string }>;
}

@Injectable()
export class ServiceCapacityService {
  constructor(private prisma: PrismaService) {}

  async resolveContext(
    serviceId: string,
    db: DbClient = this.prisma,
  ): Promise<ServiceCapacityContext> {
    const service = await db.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        providerId: true,
        duration: true,
        provider: {
          select: {
            providerProfile: { select: { accountType: true } },
          },
        },
        teams: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: { id: true, name: true },
        },
      },
    });
    if (!service) {
      throw new NotFoundException('Xidmət tapılmadı');
    }

    const accountType =
      service.provider.providerProfile?.accountType ?? ProviderAccountType.INDIVIDUAL;
    const teamCount = service.teams.length;
    const durationMinutes =
      service.duration && service.duration > 0 ? service.duration : DEFAULT_DURATION_MINUTES;

    return {
      serviceId: service.id,
      providerId: service.providerId,
      accountType,
      durationMinutes,
      teamCount,
      capacity: effectiveServiceCapacity(accountType, teamCount),
      teams: service.teams,
    };
  }

  occupancyScope(
    ctx: Pick<ServiceCapacityContext, 'accountType' | 'serviceId' | 'providerId'>,
  ): { serviceId: string } | { providerId: string } {
    if (ctx.accountType === ProviderAccountType.COMPANY) {
      return { serviceId: ctx.serviceId };
    }
    return { providerId: ctx.providerId };
  }

  async loadOccupancyWindows(
    ctx: Pick<
      ServiceCapacityContext,
      'accountType' | 'serviceId' | 'providerId' | 'durationMinutes'
    >,
    from: Date,
    toExclusive: Date,
    db: DbClient,
    excludeBookingId?: string,
  ): Promise<Array<{ startMs: number; endMs: number; teamId: string | null }>> {
    const bookings = await db.booking.findMany({
      where: {
        ...this.occupancyScope(ctx),
        ...capacityHoldingBookingWhere(excludeBookingId),
        scheduledAt: {
          gte: from,
          lt: toExclusive,
        },
      },
      select: {
        scheduledAt: true,
        teamId: true,
        service: { select: { duration: true } },
      },
    });

    return bookings.map((booking) => {
      const duration =
        booking.service.duration && booking.service.duration > 0
          ? booking.service.duration
          : ctx.durationMinutes;
      const startMs = booking.scheduledAt.getTime();
      return {
        startMs,
        endMs: bookingWindowEndMs(startMs, duration),
        teamId: booking.teamId,
      };
    });
  }

  occupiedAt(
    startMs: number,
    endMs: number,
    windows: Array<{ startMs: number; endMs: number }>,
  ): number {
    return countOverlappingWindows(startMs, endMs, windows);
  }

  isBusyAt(
    startMs: number,
    endMs: number,
    windows: Array<{ startMs: number; endMs: number }>,
    capacity: number,
  ): boolean {
    return isSlotAtCapacity(this.occupiedAt(startMs, endMs, windows), capacity);
  }

  async ensureDefaultTeam(serviceId: string, db: DbClient = this.prisma): Promise<void> {
    const existing = await db.serviceTeam.findFirst({
      where: { serviceId },
      select: { id: true },
    });
    if (existing) return;

    await db.serviceTeam.create({
      data: {
        serviceId,
        name: SERVICE_TEAMS.DEFAULT_NAME,
        sortOrder: 0,
        isDefault: true,
        isActive: true,
      },
    });
  }

  /**
   * Boş komanda tapır. Çağıran tərəf əvvəl `pg_advisory_xact_lock` almalıdır.
   */
  async assignFreeTeam(
    serviceId: string,
    scheduledAt: Date,
    db: DbClient,
    excludeBookingId?: string,
  ): Promise<string> {
    await this.ensureDefaultTeam(serviceId, db);
    const ctx = await this.resolveContext(serviceId, db);
    const padMs = Math.max(ctx.durationMinutes, DEFAULT_DURATION_MINUTES) * 60_000;
    const windows = await this.loadOccupancyWindows(
      ctx,
      new Date(scheduledAt.getTime() - padMs),
      new Date(scheduledAt.getTime() + padMs * 2),
      db,
      excludeBookingId,
    );
    const startMs = scheduledAt.getTime();
    const endMs = bookingWindowEndMs(startMs, ctx.durationMinutes);
    const overlapping = windows.filter((window) =>
      this.occupiedAt(startMs, endMs, [window]) > 0,
    );

    if (isSlotAtCapacity(overlapping.length, ctx.capacity)) {
      throw new BadRequestException('Seçilmiş vaxt doludur — bütün komandalar məşğuldur');
    }

    const busyTeamIds = new Set(
      overlapping.map((window) => window.teamId).filter((id): id is string => Boolean(id)),
    );
    const freeTeam = ctx.teams.find((team) => !busyTeamIds.has(team.id)) ?? ctx.teams[0];
    if (!freeTeam) {
      throw new BadRequestException('Bu xidmət üçün aktiv komanda yoxdur');
    }
    return freeTeam.id;
  }

  async hasFreeCapacityAt(
    providerId: string,
    at: Date,
    db: DbClient = this.prisma,
  ): Promise<boolean> {
    const profile = await db.providerProfile.findUnique({
      where: { userId: providerId },
      select: { accountType: true },
    });
    const accountType = profile?.accountType ?? ProviderAccountType.INDIVIDUAL;

    const services = await db.service.findMany({
      where: {
        providerId,
        status: ServiceStatus.ACTIVE,
      },
      select: {
        id: true,
        duration: true,
        _count: { select: { teams: { where: { isActive: true } } } },
      },
    });
    if (services.length === 0) {
      return true;
    }

    if (accountType !== ProviderAccountType.COMPANY) {
      const duration = Math.max(
        DEFAULT_DURATION_MINUTES,
        ...services.map((s) => (s.duration && s.duration > 0 ? s.duration : DEFAULT_DURATION_MINUTES)),
      );
      const padMs = duration * 60_000;
      const windows = await this.loadOccupancyWindows(
        {
          accountType,
          serviceId: services[0]?.id ?? '',
          providerId,
          durationMinutes: duration,
        },
        new Date(at.getTime() - padMs),
        new Date(at.getTime() + padMs * 2),
        db,
      );
      const startMs = at.getTime();
      return !this.isBusyAt(startMs, bookingWindowEndMs(startMs, duration), windows, 1);
    }

    for (const service of services) {
      const duration =
        service.duration && service.duration > 0 ? service.duration : DEFAULT_DURATION_MINUTES;
      const capacity = effectiveServiceCapacity(accountType, service._count.teams);
      const padMs = duration * 60_000;
      const windows = await this.loadOccupancyWindows(
        {
          accountType,
          serviceId: service.id,
          providerId,
          durationMinutes: duration,
        },
        new Date(at.getTime() - padMs),
        new Date(at.getTime() + padMs * 2),
        db,
      );
      const startMs = at.getTime();
      if (!this.isBusyAt(startMs, bookingWindowEndMs(startMs, duration), windows, capacity)) {
        return true;
      }
    }
    return false;
  }

  /**
   * OFFLINE-ə toxunmur. Tutum qalıbsa ONLINE, yoxdursa BUSY.
   */
  async syncAvailability(
    providerId: string,
    db: DbClient = this.prisma,
  ): Promise<ProviderAvailability> {
    const profile = await db.providerProfile.findUnique({
      where: { userId: providerId },
      select: { availability: true },
    });
    if (!profile) return ProviderAvailability.OFFLINE;
    if (profile.availability === ProviderAvailability.OFFLINE) {
      return ProviderAvailability.OFFLINE;
    }

    const hasFree = await this.hasFreeCapacityAt(providerId, new Date(), db);
    const next = hasFree ? ProviderAvailability.ONLINE : ProviderAvailability.BUSY;
    if (next !== profile.availability) {
      await db.providerProfile.update({
        where: { userId: providerId },
        data: { availability: next },
      });
    }
    return next;
  }

  async filterProviderIdsWithCapacity(
    rows: Array<{ providerId: string; serviceId: string }>,
    scheduledAt: Date,
    db: DbClient = this.prisma,
  ): Promise<Set<string>> {
    const allowed = new Set<string>();
    if (rows.length === 0) return allowed;

    const serviceByProvider = new Map<string, string>();
    for (const row of rows) {
      if (!serviceByProvider.has(row.providerId)) {
        serviceByProvider.set(row.providerId, row.serviceId);
      }
    }
    const serviceIds = [...serviceByProvider.values()];
    const services = await db.service.findMany({
      where: { id: { in: serviceIds } },
      select: {
        id: true,
        providerId: true,
        duration: true,
        provider: {
          select: { providerProfile: { select: { accountType: true } } },
        },
        teams: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    });

    const companyIds: string[] = [];
    const individualIds: string[] = [];
    const ctxByService = new Map<string, ServiceCapacityContext>();

    for (const service of services) {
      const accountType =
        service.provider.providerProfile?.accountType ?? ProviderAccountType.INDIVIDUAL;
      const durationMinutes =
        service.duration && service.duration > 0 ? service.duration : DEFAULT_DURATION_MINUTES;
      const ctx: ServiceCapacityContext = {
        serviceId: service.id,
        providerId: service.providerId,
        accountType,
        durationMinutes,
        teamCount: service.teams.length,
        capacity: effectiveServiceCapacity(accountType, service.teams.length),
        teams: service.teams.map((team) => ({ id: team.id, name: '' })),
      };
      ctxByService.set(service.id, ctx);
      if (accountType === ProviderAccountType.COMPANY) {
        companyIds.push(service.id);
      } else {
        individualIds.push(service.providerId);
      }
    }

    const orFilters: Prisma.BookingWhereInput[] = [];
    if (companyIds.length > 0) {
      orFilters.push({ serviceId: { in: companyIds } });
    }
    if (individualIds.length > 0) {
      orFilters.push({ providerId: { in: individualIds } });
    }
    if (orFilters.length === 0) return allowed;

    const padMs = 24 * 60 * 60 * 1000;
    const bookings = await db.booking.findMany({
      where: {
        ...capacityHoldingBookingWhere(),
        scheduledAt: {
          gte: new Date(scheduledAt.getTime() - padMs),
          lt: new Date(scheduledAt.getTime() + padMs),
        },
        OR: orFilters,
      },
      select: {
        serviceId: true,
        providerId: true,
        scheduledAt: true,
        service: { select: { duration: true } },
      },
    });

    const startMs = scheduledAt.getTime();
    for (const [providerId, serviceId] of serviceByProvider) {
      const ctx = ctxByService.get(serviceId);
      if (!ctx) continue;
      const relevant = bookings.filter((booking) =>
        ctx.accountType === ProviderAccountType.COMPANY
          ? booking.serviceId === serviceId
          : booking.providerId === providerId,
      );
      const windows = relevant.map((booking) => {
        const duration =
          booking.service.duration && booking.service.duration > 0
            ? booking.service.duration
            : ctx.durationMinutes;
        const bStart = booking.scheduledAt.getTime();
        return { startMs: bStart, endMs: bookingWindowEndMs(bStart, duration) };
      });
      const endMs = bookingWindowEndMs(startMs, ctx.durationMinutes);
      if (!this.isBusyAt(startMs, endMs, windows, ctx.capacity)) {
        allowed.add(providerId);
      }
    }
    return allowed;
  }
}
