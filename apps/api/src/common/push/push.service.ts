import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PUSH_ADAPTER, type PushAdapter, type PushMessage } from './push.types';

const INVALID_TOKEN_CODES = new Set([
  'UNREGISTERED',
  'NOT_FOUND',
  'INVALID_ARGUMENT',
  'NotRegistered',
  'InvalidRegistration',
]);

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(PUSH_ADAPTER) private adapter: PushAdapter,
  ) {}

  get adapterName(): string {
    return this.adapter.name;
  }

  async sendToUser(userId: string, message: PushMessage): Promise<void> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId },
      select: { id: true, token: true },
    });

    if (tokens.length === 0) return;

    await Promise.all(
      tokens.map(async (row) => {
        try {
          await this.adapter.send(row.token, message);
        } catch (error) {
          const code =
            error instanceof Error
              ? (error as Error & { fcmErrorCode?: string }).fcmErrorCode
              : undefined;
          this.logger.warn(
            `Push uğursuz (${row.id}): ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          if (code && INVALID_TOKEN_CODES.has(code)) {
            await this.prisma.deviceToken
              .delete({ where: { id: row.id } })
              .catch(() => undefined);
            this.logger.debug(`Invalid device token silindi: ${row.id}`);
          }
        }
      }),
    );
  }
}
