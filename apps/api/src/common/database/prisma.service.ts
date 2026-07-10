import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

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
