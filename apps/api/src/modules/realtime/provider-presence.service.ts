import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { ProviderAvailability } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { DispatchService } from '../dispatch/dispatch.service';

/**
 * Provider WS presence — User.lastSeenAt + ProviderAvailability.
 * Redis INCR/DECR ilə multi-instance; Redis yoxdursa process-local Map.
 * Yalnız PROVIDER profilinə toxunur; CUSTOMER/ADMIN OFFLINE edilmir.
 * BUSY sifariş zamanı connect/disconnect-də toxunulmur.
 */
@Injectable()
export class ProviderPresenceService {
  private readonly logger = new Logger(ProviderPresenceService.name);
  /** Fallback: aktiv WS bağlantı sayı (provider userId → count) */
  private readonly connections = new Map<string, number>();

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    @Optional()
    @Inject(forwardRef(() => DispatchService))
    private dispatch?: DispatchService,
  ) {}

  async onProviderConnect(userId: string): Promise<void> {
    const n = await this.bumpConnections(userId, +1);

    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: now },
    });

    // İlk socket — təsdiqlənmiş oflayn xidmət verəni onlayn et (BUSY saxlanılır)
    if (n === 1) {
      const result = await this.prisma.providerProfile.updateMany({
        where: {
          userId,
          isVerified: true,
          availability: ProviderAvailability.OFFLINE,
        },
        data: { availability: ProviderAvailability.ONLINE },
      });
      if (result.count > 0) {
        this.logger.debug(`Provider presence ONLINE (WS connect): ${userId}`);
        this.dispatch?.notifyProviderOnline(userId);
      }
    }

    this.logger.debug(`Provider WS connect: ${userId} (n=${n})`);
  }

  async onProviderDisconnect(userId: string): Promise<void> {
    const next = await this.bumpConnections(userId, -1);
    if (next > 0) return;

    // Son socket — yalnız ONLINE → OFFLINE (BUSY saxlanılır)
    const result = await this.prisma.providerProfile.updateMany({
      where: {
        userId,
        availability: ProviderAvailability.ONLINE,
      },
      data: { availability: ProviderAvailability.OFFLINE },
    });

    if (result.count > 0) {
      this.logger.debug(`Provider presence OFFLINE (WS disconnect): ${userId}`);
    }
  }

  private redisKey(userId: string): string {
    return `presence:ws:${userId}`;
  }

  private async bumpConnections(userId: string, delta: 1 | -1): Promise<number> {
    const key = this.redisKey(userId);
    if (delta > 0) {
      const n = await this.redis.incr(key);
      if (n != null) {
        await this.redis.expire(key, 86_400);
        return n;
      }
      const prev = this.connections.get(userId) ?? 0;
      const next = prev + 1;
      this.connections.set(userId, next);
      return next;
    }

    const n = await this.redis.decr(key);
    if (n != null) {
      if (n <= 0) {
        await this.redis.del(key);
        return 0;
      }
      return n;
    }

    const prev = this.connections.get(userId) ?? 0;
    const next = Math.max(0, prev - 1);
    if (next === 0) {
      this.connections.delete(userId);
    } else {
      this.connections.set(userId, next);
    }
    return next;
  }
}
