import { Injectable, Logger } from '@nestjs/common';
import { ProviderAvailability } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';

/**
 * Provider WS presence — User.lastSeenAt + ProviderAvailability.
 * Yalnız PROVIDER profilinə toxunur; CUSTOMER/ADMIN OFFLINE edilmir.
 * BUSY sifariş zamanı disconnect-də toxunulmur.
 */
@Injectable()
export class ProviderPresenceService {
  private readonly logger = new Logger(ProviderPresenceService.name);
  /** Aktiv WS bağlantı sayı (provider userId → count) */
  private readonly connections = new Map<string, number>();

  constructor(private prisma: PrismaService) {}

  async onProviderConnect(userId: string): Promise<void> {
    const prev = this.connections.get(userId) ?? 0;
    this.connections.set(userId, prev + 1);

    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: now },
    });
    this.logger.debug(`Provider WS connect: ${userId} (n=${prev + 1})`);
  }

  async onProviderDisconnect(userId: string): Promise<void> {
    const prev = this.connections.get(userId) ?? 0;
    const next = Math.max(0, prev - 1);
    if (next === 0) {
      this.connections.delete(userId);
    } else {
      this.connections.set(userId, next);
    }

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
}
