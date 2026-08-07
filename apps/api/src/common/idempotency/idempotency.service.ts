import { createHash } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NOTIFICATION_CHANNELS } from '@xidmetal/shared';
import { Prisma } from '@xidmetal/database';
import { PrismaService } from '../database/prisma.service';

export interface IdempotencyLookupResult {
  hit: true;
  statusCode: number;
  body: unknown;
}

export interface IdempotencyMiss {
  hit: false;
}

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 saat

/**
 * Ümumi idempotency saxlama (IdempotencyRecord).
 * TTL: expiresAt — dövri cleanup köhnə sətirləri silir.
 */
@Injectable()
export class IdempotencyService implements OnModuleInit {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly ttlHours: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const raw = this.config.get<string>('IDEMPOTENCY_TTL_HOURS')?.trim();
    const parsed = raw ? Number(raw) : NaN;
    this.ttlHours =
      Number.isFinite(parsed) && parsed > 0
        ? parsed
        : NOTIFICATION_CHANNELS.IDEMPOTENCY_TTL_HOURS;
  }

  onModuleInit(): void {
    setTimeout(() => {
      void this.purgeExpired();
    }, 20_000);

    this.cleanupTimer = setInterval(() => {
      void this.purgeExpired();
    }, CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref?.();
  }

  async purgeExpired(): Promise<number> {
    try {
      const result = await this.prisma.idempotencyRecord.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (result.count > 0) {
        this.logger.log(`Idempotency TTL cleanup: ${result.count} sətir silindi`);
      }
      return result.count;
    } catch (error) {
      this.logger.warn(
        `Idempotency cleanup uğursuz: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return 0;
    }
  }

  hashBody(body: unknown): string {
    const json = JSON.stringify(body ?? null);
    return createHash('sha256').update(json).digest('hex');
  }

  async findExisting(
    key: string,
    userId: string,
    route: string,
  ): Promise<IdempotencyLookupResult | IdempotencyMiss> {
    const row = await this.prisma.idempotencyRecord.findUnique({
      where: {
        key_userId_route: { key, userId, route },
      },
    });

    if (!row) return { hit: false };
    if (row.expiresAt.getTime() <= Date.now()) {
      await this.prisma.idempotencyRecord
        .delete({ where: { id: row.id } })
        .catch(() => undefined);
      return { hit: false };
    }

    return {
      hit: true,
      statusCode: row.statusCode,
      body: row.responseBody ?? null,
    };
  }

  async save(input: {
    key: string;
    userId: string;
    route: string;
    statusCode: number;
    body: unknown;
  }): Promise<void> {
    const expiresAt = new Date(Date.now() + this.ttlHours * 60 * 60 * 1000);
    const responseHash = this.hashBody(input.body);

    try {
      await this.prisma.idempotencyRecord.create({
        data: {
          key: input.key,
          userId: input.userId,
          route: input.route,
          statusCode: input.statusCode,
          responseBody:
            input.body === undefined
              ? Prisma.JsonNull
              : (input.body as Prisma.InputJsonValue),
          responseHash,
          expiresAt,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Race: digər request eyni açarı yazdı — mövcudu qaytarmaq caller-ın işidir
        this.logger.debug(
          `Idempotency race: key=${input.key} route=${input.route}`,
        );
        throw new ConflictException(
          'Eyni Idempotency-Key ilə sorğu artıq işlənilir və ya tamamlanıb',
        );
      }
      throw error;
    }
  }

  /**
   * Eyni açar + fərqli request body hash → conflict.
   * Eyni hash → cached response.
   */
  assertCompatibleOrThrow(
    existingHash: string | null | undefined,
    requestBody: unknown,
  ): void {
    if (!existingHash) return;
    const next = this.hashBody(requestBody);
    if (existingHash !== next) {
      throw new ConflictException(
        'İdempotency açarı fərqli sorğu gövdəsi ilə təkrar istifadə olunub',
      );
    }
  }
}
