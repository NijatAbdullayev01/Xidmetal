import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  AnalyticsEventType,
  BookingStatus,
  UserRole,
  type AdminAnalyticsOverview,
} from '@xidmetal/shared';
import { Prisma } from '@xidmetal/database';
import { PrismaService } from '../../common/database/prisma.service';
import type { AdminAnalyticsQueryDto, AnalyticsBeaconDto } from './dto';

const BOT_UA =
  /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|preview|headless/i;

function sanitizePath(path: string | undefined): string | undefined {
  if (!path) return undefined;
  try {
    const url = new URL(path, 'https://xidmetal.local');
    const clean = `${url.pathname}${url.hash || ''}`.slice(0, 500);
    return clean.startsWith('/') ? clean : `/${clean}`;
  } catch {
    return path.startsWith('/') ? path.slice(0, 500) : undefined;
  }
}

function truncate(value: string | undefined, max: number): string | undefined {
  if (!value) return undefined;
  return value.slice(0, max);
}

function parseDayBound(from?: string, to?: string): { start: Date; end: Date } {
  const now = new Date();
  const endDay = to ?? now.toISOString().slice(0, 10);
  const startDefault = new Date(now);
  startDefault.setUTCDate(startDefault.getUTCDate() - 29);
  const startDay = from ?? startDefault.toISOString().slice(0, 10);

  const start = new Date(`${startDay}T00:00:00.000Z`);
  const end = new Date(`${endDay}T23:59:59.999Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new BadRequestException('Tarix aralığı etibarsızdır');
  }
  if (start > end) {
    throw new BadRequestException('Başlanğıc tarixi bitmə tarixindən sonra ola bilməz');
  }
  const maxSpanMs = 93 * 24 * 60 * 60 * 1000;
  if (end.getTime() - start.getTime() > maxSpanMs) {
    throw new BadRequestException('Maksimum 93 günlük aralıq seçilə bilər');
  }

  return { start, end };
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  async ingestBeacon(
    dto: AnalyticsBeaconDto,
    userAgent: string | undefined,
  ): Promise<{ ok: true }> {
    if (userAgent && BOT_UA.test(userAgent)) {
      return { ok: true };
    }

    const now = new Date();
    const landingPath = sanitizePath(dto.landingPath);
    const referrer = truncate(dto.referrer, 1000);
    const language = truncate(dto.language, 32);
    const ua = truncate(userAgent, 500);

    const pageViewPaths: string[] = [];
    let lastPath: string | undefined;

    const eventRows: Prisma.AnalyticsEventCreateManyInput[] = [];

    for (const event of dto.events) {
      if (
        (event.type === AnalyticsEventType.PAGE_VIEW ||
          event.type === AnalyticsEventType.CLICK) &&
        !event.path
      ) {
        throw new BadRequestException('page_view və click üçün path məcburidir');
      }
      if (event.type === AnalyticsEventType.CLICK && !event.name) {
        throw new BadRequestException('click üçün name məcburidir');
      }

      const path = sanitizePath(event.path);
      if (event.type === AnalyticsEventType.PAGE_VIEW && path) {
        pageViewPaths.push(path);
        lastPath = path;
      }
      if (event.type === AnalyticsEventType.CLICK && path) {
        lastPath = path;
      }
      if (
        (event.type === AnalyticsEventType.HEARTBEAT ||
          event.type === AnalyticsEventType.SESSION_END) &&
        path
      ) {
        lastPath = path;
      }

      let createdAt = now;
      if (event.ts) {
        const clientTs = new Date(event.ts);
        const skew = Math.abs(clientTs.getTime() - now.getTime());
        if (!Number.isNaN(clientTs.getTime()) && skew <= 24 * 60 * 60 * 1000) {
          createdAt = clientTs;
        }
      }

      const meta =
        event.meta && Object.keys(event.meta).length > 0
          ? (Object.fromEntries(
              Object.entries(event.meta)
                .slice(0, 10)
                .map(([k, v]) => [k.slice(0, 100), String(v).slice(0, 500)]),
            ) as Prisma.InputJsonValue)
          : undefined;

      eventRows.push({
        sessionId: dto.sessionId,
        type: event.type,
        path: path ?? null,
        name: truncate(event.name, 200) ?? null,
        meta,
        createdAt,
      });
    }

    const durationMs = dto.durationMs ?? 0;

    try {
      // Eyni sessionId ilə paralel beacon-lar P2002 yarada bilər; 2-ci cəhd update olur.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await this.prisma.$transaction(async (tx) => {
            const existing = await tx.analyticsSession.findUnique({
              where: { id: dto.sessionId },
              select: {
                id: true,
                pageViews: true,
                startedAt: true,
              },
            });

            if (!existing) {
              const pageViews = pageViewPaths.length;
              await tx.analyticsSession.create({
                data: {
                  id: dto.sessionId,
                  anonymousId: dto.anonymousId,
                  userId: dto.userId ?? null,
                  startedAt: now,
                  lastSeenAt: now,
                  durationMs,
                  landingPath: landingPath ?? pageViewPaths[0] ?? null,
                  exitPath: lastPath ?? null,
                  referrer: referrer ?? null,
                  userAgent: ua ?? null,
                  language: language ?? null,
                  screenWidth: dto.screenWidth ?? null,
                  pageViews,
                  isBounce: pageViews <= 1,
                },
              });
            } else {
              const nextPageViews = existing.pageViews + pageViewPaths.length;
              const computedDuration = Math.max(
                durationMs,
                Math.max(0, now.getTime() - existing.startedAt.getTime()),
              );
              await tx.analyticsSession.update({
                where: { id: dto.sessionId },
                data: {
                  lastSeenAt: now,
                  durationMs: computedDuration,
                  exitPath: lastPath ?? undefined,
                  pageViews: nextPageViews,
                  isBounce: nextPageViews <= 1,
                  ...(dto.userId ? { userId: dto.userId } : {}),
                  ...(referrer ? { referrer } : {}),
                  ...(language ? { language } : {}),
                  ...(dto.screenWidth != null ? { screenWidth: dto.screenWidth } : {}),
                },
              });
            }

            if (eventRows.length > 0) {
              await tx.analyticsEvent.createMany({ data: eventRows });
            }
          });
          break;
        } catch (error) {
          const isUniqueRace =
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002' &&
            attempt === 0;
          if (!isUniqueRace) {
            throw error;
          }
        }
      }
    } catch (error) {
      this.logger.warn(
        `Beacon yazılmadı: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException('Analitika hadisəsi qəbul edilmədi');
    }

    return { ok: true };
  }

  async getOverview(query: AdminAnalyticsQueryDto): Promise<AdminAnalyticsOverview> {
    const { start, end } = parseDayBound(query.from, query.to);
    const from = start.toISOString().slice(0, 10);
    const to = end.toISOString().slice(0, 10);

    const [
      sessionAgg,
      visitorsRow,
      pageViews,
      clicks,
      topPagesRaw,
      topClicksRaw,
      timeseriesRaw,
      newCustomers,
      newProviders,
      newBookings,
      completedBookings,
    ] = await Promise.all([
      this.prisma.analyticsSession.aggregate({
        where: { startedAt: { gte: start, lte: end } },
        _count: { _all: true },
        _avg: { durationMs: true },
      }),
      this.prisma.$queryRaw<Array<{ visitors: bigint }>>`
        SELECT COUNT(DISTINCT anonymous_id)::bigint AS visitors
        FROM analytics_sessions
        WHERE started_at >= ${start} AND started_at <= ${end}
      `,
      this.prisma.analyticsEvent.count({
        where: {
          type: AnalyticsEventType.PAGE_VIEW,
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.analyticsEvent.count({
        where: {
          type: AnalyticsEventType.CLICK,
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.$queryRaw<
        Array<{ path: string; views: bigint; unique_sessions: bigint }>
      >`
        SELECT
          path,
          COUNT(*)::bigint AS views,
          COUNT(DISTINCT session_id)::bigint AS unique_sessions
        FROM analytics_events
        WHERE type = 'PAGE_VIEW'
          AND path IS NOT NULL
          AND created_at >= ${start}
          AND created_at <= ${end}
        GROUP BY path
        ORDER BY views DESC
        LIMIT 15
      `,
      this.prisma.$queryRaw<
        Array<{ name: string; path: string | null; count: bigint }>
      >`
        SELECT
          name,
          path,
          COUNT(*)::bigint AS count
        FROM analytics_events
        WHERE type = 'CLICK'
          AND name IS NOT NULL
          AND created_at >= ${start}
          AND created_at <= ${end}
        GROUP BY name, path
        ORDER BY count DESC
        LIMIT 15
      `,
      this.prisma.$queryRaw<
        Array<{
          day: Date;
          visitors: bigint;
          sessions: bigint;
          page_views: bigint;
        }>
      >`
        SELECT
          date_trunc('day', s.started_at AT TIME ZONE 'UTC') AS day,
          COUNT(DISTINCT s.anonymous_id)::bigint AS visitors,
          COUNT(*)::bigint AS sessions,
          COALESCE(SUM(s.page_views), 0)::bigint AS page_views
        FROM analytics_sessions s
        WHERE s.started_at >= ${start} AND s.started_at <= ${end}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      this.prisma.user.count({
        where: {
          role: UserRole.CUSTOMER,
          deletedAt: null,
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.user.count({
        where: {
          role: UserRole.PROVIDER,
          deletedAt: null,
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.booking.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.booking.count({
        where: {
          status: BookingStatus.COMPLETED,
          updatedAt: { gte: start, lte: end },
        },
      }),
    ]);

    const sessions = sessionAgg._count._all;
    const bounceSessions = await this.prisma.analyticsSession.count({
      where: {
        startedAt: { gte: start, lte: end },
        isBounce: true,
      },
    });

    const bounceRate = sessions > 0 ? bounceSessions / sessions : 0;

    return {
      from,
      to,
      visitors: Number(visitorsRow[0]?.visitors ?? 0n),
      sessions,
      pageViews,
      avgDurationMs: Math.round(sessionAgg._avg.durationMs ?? 0),
      bounceRate: Math.round(bounceRate * 1000) / 1000,
      clicks,
      topPages: topPagesRaw.map((row) => ({
        path: row.path,
        views: Number(row.views),
        uniqueSessions: Number(row.unique_sessions),
      })),
      topClicks: topClicksRaw.map((row) => ({
        name: row.name,
        path: row.path,
        count: Number(row.count),
      })),
      timeseries: timeseriesRaw.map((row) => ({
        date: new Date(row.day).toISOString().slice(0, 10),
        visitors: Number(row.visitors),
        sessions: Number(row.sessions),
        pageViews: Number(row.page_views),
      })),
      business: {
        newCustomers,
        newProviders,
        newBookings,
        completedBookings,
      },
    };
  }
}
