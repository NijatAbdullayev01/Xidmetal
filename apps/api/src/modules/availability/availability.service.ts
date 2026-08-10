import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { BookingStatus, ServiceStatus, type Prisma } from '@prisma/client';
import { ACTIVE_BOOKING_STATUSES as SHARED_ACTIVE_BOOKING_STATUSES } from '@xidmetal/shared';
import { PrismaService } from '../../common/database/prisma.service';
import {
  AvailabilityOverrideType,
  AvailabilitySlotStatus,
  type DayAvailability,
  type AvailabilitySlot,
  type WorkingHoursDay,
  type AvailabilityOverride,
} from '@xidmetal/shared';
import {
  UpsertWorkingHoursDto,
  CreateAvailabilityOverrideDto,
} from './dto';
import { bookingWindowEndMs, rangesOverlap } from '../../common/booking/booking-overlap';

/** Azərbaycan sabit UTC+4 (DST yoxdur) — iş saatları bu zonada saxlanılır */
const BAKU_OFFSET = '+04:00';
const DEFAULT_DURATION_MINUTES = 60;
const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  ...SHARED_ACTIVE_BOOKING_STATUSES,
] as BookingStatus[];

interface TimeRange {
  startMin: number;
  endMin: number;
}

type DbClient = PrismaService | Prisma.TransactionClient;
type BookingScope = 'provider' | 'service';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async getWorkingHours(serviceId: string, userId: string): Promise<WorkingHoursDay[]> {
    await this.assertServiceOwner(serviceId, userId);
    const rows = await this.prisma.serviceWorkingHours.findMany({
      where: { serviceId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return rows.map((row) => this.mapWorkingHours(row));
  }

  async upsertWorkingHours(
    serviceId: string,
    userId: string,
    dto: UpsertWorkingHoursDto,
  ): Promise<WorkingHoursDay[]> {
    await this.assertServiceOwner(serviceId, userId);

    for (const entry of dto.hours) {
      if (entry.startTime >= entry.endTime) {
        throw new BadRequestException('Başlama saati bitmə saatından əvvəl olmalıdır');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.serviceWorkingHours.deleteMany({ where: { serviceId } });
      if (dto.hours.length === 0) return;
      await tx.serviceWorkingHours.createMany({
        data: dto.hours.map((h) => ({
          serviceId,
          dayOfWeek: h.dayOfWeek,
          startTime: h.startTime,
          endTime: h.endTime,
          isActive: h.isActive ?? true,
        })),
      });
    });

    return this.getWorkingHours(serviceId, userId);
  }

  async getOverrides(
    serviceId: string,
    userId: string,
    from: string,
    to: string,
  ): Promise<AvailabilityOverride[]> {
    await this.assertServiceOwner(serviceId, userId);
    this.assertDateRange(from, to);

    const rows = await this.prisma.serviceAvailabilityOverride.findMany({
      where: {
        serviceId,
        date: {
          gte: this.parseDateOnly(from),
          lte: this.parseDateOnly(to),
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return rows.map((row) => this.mapOverride(row));
  }

  async createOverride(
    serviceId: string,
    userId: string,
    dto: CreateAvailabilityOverrideDto,
  ): Promise<AvailabilityOverride> {
    await this.assertServiceOwner(serviceId, userId);

    const startTime = dto.startTime || null;
    const endTime = dto.endTime || null;
    if (Boolean(startTime) !== Boolean(endTime)) {
      throw new BadRequestException('Başlama və bitmə saatı birlikdə daxil edilməlidir');
    }
    if (startTime && endTime && startTime >= endTime) {
      throw new BadRequestException('Başlama saati bitmə saatından əvvəl olmalıdır');
    }

    const created = await this.prisma.serviceAvailabilityOverride.create({
      data: {
        serviceId,
        date: this.parseDateOnly(dto.date),
        startTime,
        endTime,
        type: dto.type,
        note: dto.note?.trim() || null,
      },
    });

    return this.mapOverride(created);
  }

  async deleteOverride(serviceId: string, overrideId: string, userId: string): Promise<void> {
    await this.assertServiceOwner(serviceId, userId);

    const existing = await this.prisma.serviceAvailabilityOverride.findUnique({
      where: { id: overrideId },
    });
    if (!existing || existing.serviceId !== serviceId) {
      throw new NotFoundException('Override tapılmadı');
    }

    await this.prisma.serviceAvailabilityOverride.delete({ where: { id: overrideId } });
  }

  async resolveSlots(
    serviceId: string,
    from: string,
    to: string,
    db: DbClient = this.prisma,
  ): Promise<DayAvailability[]> {
    return this.resolveSlotsInternal(serviceId, from, to, db, {
      bookingScope: 'provider',
      requirePublicService: false,
    });
  }

  async resolvePublicSlots(serviceId: string, from: string, to: string): Promise<DayAvailability[]> {
    return this.resolveSlotsInternal(serviceId, from, to, this.prisma, {
      bookingScope: 'service',
      requirePublicService: true,
    });
  }

  private async resolveSlotsInternal(
    serviceId: string,
    from: string,
    to: string,
    db: DbClient,
    options: {
      bookingScope: BookingScope;
      requirePublicService: boolean;
    },
  ): Promise<DayAvailability[]> {
    this.assertDateRange(from, to);

    const service = await db.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        providerId: true,
        duration: true,
        status: true,
        category: { select: { isActive: true } },
        provider: {
          select: {
            providerProfile: { select: { isVerified: true } },
          },
        },
      },
    });
    if (!service) {
      throw new NotFoundException('Xidmət tapılmadı');
    }
    if (
      options.requirePublicService &&
      (service.status !== ServiceStatus.ACTIVE ||
        !service.category?.isActive ||
        !service.provider.providerProfile?.isVerified)
    ) {
      throw new NotFoundException('Xidmət tapılmadı');
    }

    const duration = service.duration && service.duration > 0 ? service.duration : DEFAULT_DURATION_MINUTES;
    const fromDate = this.parseDateOnly(from);
    const toDate = this.parseDateOnly(to);

    const [workingHours, overrides, bookings] = await Promise.all([
      db.serviceWorkingHours.findMany({
        where: { serviceId, isActive: true },
      }),
      db.serviceAvailabilityOverride.findMany({
        where: {
          serviceId,
          date: { gte: fromDate, lte: toDate },
        },
      }),
      db.booking.findMany({
        where: {
          ...(options.bookingScope === 'provider'
            ? { providerId: service.providerId }
            : { serviceId }),
          status: { in: ACTIVE_BOOKING_STATUSES },
          scheduledAt: {
            gte: fromDate,
            lt: this.addDays(toDate, 1),
          },
        },
        select: {
          scheduledAt: true,
          service: { select: { duration: true } },
        },
      }),
    ]);

    const hasCalendar = workingHours.length > 0 || overrides.length > 0;
    const busyRanges = bookings.map((b) => {
      const start = b.scheduledAt;
      const bookingDuration =
        b.service.duration && b.service.duration > 0 ? b.service.duration : DEFAULT_DURATION_MINUTES;
      return {
        startMs: start.getTime(),
        endMs: bookingWindowEndMs(start.getTime(), bookingDuration),
      };
    });

    const days: DayAvailability[] = [];
    for (let cursor = new Date(fromDate); cursor <= toDate; cursor = this.addDays(cursor, 1)) {
      const dateStr = this.formatDateOnly(cursor);
      const dayOfWeek = cursor.getUTCDay();
      const dayOverrides = overrides.filter(
        (o) => this.formatDateOnly(o.date) === dateStr,
      );

      const windows = this.buildDayWindows(dayOfWeek, workingHours, dayOverrides);
      const slots: AvailabilitySlot[] = [];

      for (const window of windows) {
        for (let startMin = window.startMin; startMin + duration <= window.endMin; startMin += duration) {
          const endMin = startMin + duration;
          const slotStart = this.combineDateAndMinutes(cursor, startMin);
          const slotEnd = this.combineDateAndMinutes(cursor, endMin);
          const startMs = slotStart.getTime();
          const endMs = slotEnd.getTime();
          const overlapsBusy = busyRanges.some((busy) =>
            rangesOverlap(startMs, endMs, busy.startMs, busy.endMs),
          );
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            status: overlapsBusy ? AvailabilitySlotStatus.BUSY : AvailabilitySlotStatus.FREE,
          });
        }
      }

      days.push({ date: dateStr, slots, hasCalendar });
    }

    return days;
  }

  /**
   * Slotun təqvimdə mövcud və boş olduğunu yoxlayır.
   * Race-safe çağırış üçün `tx` ilə transaction daxilində istifadə edin
   * (əvvəl `pg_advisory_xact_lock` alınmalıdır).
   */
  async assertSlotIsFree(
    serviceId: string,
    scheduledAt: Date,
    options?: { excludeBookingId?: string; tx?: Prisma.TransactionClient },
  ): Promise<void> {
    const db: DbClient = options?.tx ?? this.prisma;
    const dateStr = this.formatDateOnly(scheduledAt);
    const days = await this.resolveSlots(serviceId, dateStr, dateStr, db);
    const day = days[0];
    if (!day || !day.hasCalendar) {
      throw new BadRequestException('Xidmət verən hələ təqvim təyin etməyib');
    }

    const slot = day.slots.find((s) => new Date(s.start).getTime() === scheduledAt.getTime());
    if (!slot) {
      throw new BadRequestException('Seçilmiş vaxt doludur və ya əlçatan deyil');
    }

    if (slot.status === AvailabilitySlotStatus.BUSY) {
      if (options?.excludeBookingId) {
        const service = await db.service.findUnique({
          where: { id: serviceId },
          select: { providerId: true, duration: true },
        });
        if (!service) throw new NotFoundException('Xidmət tapılmadı');
        const duration =
          service.duration && service.duration > 0 ? service.duration : DEFAULT_DURATION_MINUTES;
        const endMs = bookingWindowEndMs(scheduledAt.getTime(), duration);
        const candidates = await db.booking.findMany({
          where: {
            providerId: service.providerId,
            status: { in: ACTIVE_BOOKING_STATUSES },
            id: { not: options.excludeBookingId },
            scheduledAt: {
              gte: this.addDays(this.parseDateOnly(dateStr), -1),
              lt: this.addDays(this.parseDateOnly(dateStr), 2),
            },
          },
          select: {
            scheduledAt: true,
            service: { select: { duration: true } },
          },
        });
        const startMs = scheduledAt.getTime();
        const hasConflict = candidates.some((b) => {
          const bDuration =
            b.service.duration && b.service.duration > 0
              ? b.service.duration
              : DEFAULT_DURATION_MINUTES;
          const bStart = b.scheduledAt.getTime();
          const bEnd = bookingWindowEndMs(bStart, bDuration);
          return rangesOverlap(startMs, endMs, bStart, bEnd);
        });
        if (hasConflict) {
          throw new BadRequestException('Seçilmiş vaxt doludur və ya əlçatan deyil');
        }
        return;
      }
      throw new BadRequestException('Seçilmiş vaxt doludur və ya əlçatan deyil');
    }
  }

  /**
   * Eyni provider üzrə paralel bronları seriyalaşdırır (transaction-scoped advisory lock).
   * `create` / `reschedule` / `confirmReschedule` daxilində çağırın.
   */
  async lockProviderBookings(
    tx: Prisma.TransactionClient,
    providerId: string,
  ): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${providerId}))`;
  }

  private buildDayWindows(
    dayOfWeek: number,
    workingHours: Array<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }>,
    dayOverrides: Array<{
      type: string;
      startTime: string | null;
      endTime: string | null;
    }>,
  ): TimeRange[] {
    let windows: TimeRange[] = workingHours
      .filter((h) => h.dayOfWeek === dayOfWeek && h.isActive)
      .map((h) => ({
        startMin: this.timeToMinutes(h.startTime),
        endMin: this.timeToMinutes(h.endTime),
      }));

    for (const override of dayOverrides) {
      if (override.type !== AvailabilityOverrideType.AVAILABLE) continue;
      const range = this.overrideToRange(override);
      if (range) windows.push(range);
    }

    windows = this.mergeRanges(windows);

    for (const override of dayOverrides) {
      if (override.type !== AvailabilityOverrideType.BLOCKED) continue;
      const blocked = this.overrideToRange(override) ?? { startMin: 0, endMin: 24 * 60 };
      windows = this.subtractRange(windows, blocked);
    }

    return windows;
  }

  private overrideToRange(override: {
    startTime: string | null;
    endTime: string | null;
  }): TimeRange | null {
    if (!override.startTime || !override.endTime) {
      return { startMin: 0, endMin: 24 * 60 };
    }
    return {
      startMin: this.timeToMinutes(override.startTime),
      endMin: this.timeToMinutes(override.endTime),
    };
  }

  private mergeRanges(ranges: TimeRange[]): TimeRange[] {
    if (ranges.length === 0) return [];
    const sorted = [...ranges].sort((a, b) => a.startMin - b.startMin);
    const first = sorted[0];
    if (!first) return [];
    const merged: TimeRange[] = [{ startMin: first.startMin, endMin: first.endMin }];
    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];
      if (!current || !last) continue;
      if (current.startMin <= last.endMin) {
        last.endMin = Math.max(last.endMin, current.endMin);
      } else {
        merged.push({ startMin: current.startMin, endMin: current.endMin });
      }
    }
    return merged;
  }

  private subtractRange(windows: TimeRange[], blocked: TimeRange): TimeRange[] {
    const result: TimeRange[] = [];
    for (const window of windows) {
      if (blocked.endMin <= window.startMin || blocked.startMin >= window.endMin) {
        result.push(window);
        continue;
      }
      if (blocked.startMin > window.startMin) {
        result.push({ startMin: window.startMin, endMin: blocked.startMin });
      }
      if (blocked.endMin < window.endMin) {
        result.push({ startMin: blocked.endMin, endMin: window.endMin });
      }
    }
    return result.filter((r) => r.endMin > r.startMin);
  }

  private async assertServiceOwner(serviceId: string, userId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { providerId: true },
    });
    if (!service) throw new NotFoundException('Xidmət tapılmadı');
    if (service.providerId !== userId) {
      throw new ForbiddenException('Bu xidmətin təqvimini idarə etmək icazəniz yoxdur');
    }
  }

  private assertDateRange(from: string, to: string) {
    const fromDate = this.parseDateOnly(from);
    const toDate = this.parseDateOnly(to);
    if (fromDate > toDate) {
      throw new BadRequestException('Başlama tarixi bitmə tarixindən sonra ola bilməz');
    }
    const maxDays = 62;
    const diffDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000);
    if (diffDays > maxDays) {
      throw new BadRequestException(`Tarix aralığı maksimum ${maxDays} gün ola bilər`);
    }
  }

  private parseDateOnly(value: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      throw new BadRequestException('Tarix YYYY-MM-DD formatında olmalıdır');
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new BadRequestException('Düzgün tarix daxil edin');
    }
    return date;
  }

  private formatDateOnly(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  private timeToMinutes(value: string): number {
    const [hoursPart, minutesPart] = value.split(':');
    const hours = Number(hoursPart);
    const mins = Number(minutesPart);
    return hours * 60 + mins;
  }

  private combineDateAndMinutes(date: Date, minutes: number): Date {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const dateStr = this.formatDateOnly(date);
    const hh = String(hours).padStart(2, '0');
    const mm = String(mins).padStart(2, '0');
    return new Date(`${dateStr}T${hh}:${mm}:00${BAKU_OFFSET}`);
  }

  private mapWorkingHours(row: {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }): WorkingHoursDay {
    return {
      id: row.id,
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
      endTime: row.endTime,
      isActive: row.isActive,
    };
  }

  private mapOverride(row: {
    id: string;
    serviceId: string;
    date: Date;
    startTime: string | null;
    endTime: string | null;
    type: string;
    note: string | null;
  }): AvailabilityOverride {
    return {
      id: row.id,
      serviceId: row.serviceId,
      date: this.formatDateOnly(row.date),
      startTime: row.startTime ?? undefined,
      endTime: row.endTime ?? undefined,
      type: row.type as AvailabilityOverrideType,
      note: row.note ?? undefined,
    };
  }
}
