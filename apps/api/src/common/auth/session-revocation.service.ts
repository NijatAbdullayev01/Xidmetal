import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { invalidateJwtUserCache } from './jwt-user-cache';

export const JWT_REVOKE_REDIS_PREFIX = 'jwt:revoke:';
/** Refresh pəncərəsi (30 gün) — replica cache-dən uzun saxla */
export const JWT_REVOKE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type DisconnectHandler = (userId: string) => void;

/**
 * Access JWT ləğvi: DB `sessionsRevokedAt` + Redis (multi-replica) + WS disconnect.
 */
@Injectable()
export class SessionRevocationService {
  private disconnectHandler: DisconnectHandler | null = null;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  registerDisconnectHandler(handler: DisconnectHandler): void {
    this.disconnectHandler = handler;
  }

  async readRevokedAt(userId: string): Promise<Date | null> {
    const raw = await this.redis.get(`${JWT_REVOKE_REDIS_PREFIX}${userId}`);
    if (!raw) return null;
    const ms = Number(raw);
    if (!Number.isFinite(ms) || ms <= 0) return null;
    return new Date(ms);
  }

  /**
   * DB-ni yeniləmədən replica cache + WS — caller artıq `sessionsRevokedAt` yazıbsa.
   */
  async publish(userId: string, at = new Date()): Promise<void> {
    invalidateJwtUserCache(userId);
    await this.redis.setPx(
      `${JWT_REVOKE_REDIS_PREFIX}${userId}`,
      String(at.getTime()),
      JWT_REVOKE_TTL_MS,
    );
    this.disconnectHandler?.(userId);
  }

  /** logout-all / reuse / email-change: DB + refresh silmə + publish */
  async revokeAll(userId: string, options?: { wipeRefresh?: boolean }): Promise<Date> {
    const at = new Date();
    const wipeRefresh = options?.wipeRefresh !== false;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { sessionsRevokedAt: at },
      }),
      ...(wipeRefresh
        ? [this.prisma.refreshToken.deleteMany({ where: { userId } })]
        : []),
    ]);

    await this.publish(userId, at);
    return at;
  }
}
