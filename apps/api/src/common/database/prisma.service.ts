import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma connection pool — hər API prosesi üçün limit.
 * Multi-replica: API_REPLICAS × PRISMA_CONNECTION_LIMIT < Postgres max_connections.
 */
function withPrismaPoolParams(url: string | undefined): string | undefined {
  if (!url) return url;
  if (/[?&]connection_limit=/.test(url)) return url;
  const limit = process.env.PRISMA_CONNECTION_LIMIT?.trim() || '15';
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}connection_limit=${encodeURIComponent(limit)}&pool_timeout=10`;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = withPrismaPoolParams(process.env.DATABASE_URL);
    super(
      url
        ? {
            datasources: {
              db: { url },
            },
          }
        : undefined,
    );
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Verilənlər bazasına qoşulmaq mümkün olmadı: ${message}. ` +
          'PostgreSQL işlədiyindən əmin olun (docker compose up -d və ya lokal Postgres). ' +
          'Server işə düşür, qoşulma ilk sorğuda yenidən sınanacaq.',
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
