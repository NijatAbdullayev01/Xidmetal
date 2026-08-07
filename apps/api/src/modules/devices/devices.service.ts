import { BadRequestException, Injectable } from '@nestjs/common';
import { DevicePlatform, type DeviceTokenSummary } from '@xidmetal/shared';
import { PrismaService } from '../../common/database/prisma.service';
import type { RegisterDeviceTokenDto, UnregisterDeviceTokenDto } from './dto';
import { maskDeviceToken, isValidDeviceTokenShape } from './device-token.helpers';

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  async register(
    userId: string,
    dto: RegisterDeviceTokenDto,
  ): Promise<DeviceTokenSummary> {
    if (!isValidDeviceTokenShape(dto.token)) {
      throw new BadRequestException('Cihaz tokeni etibarsızdır');
    }

    const row = await this.prisma.deviceToken.upsert({
      where: { token: dto.token },
      create: {
        userId,
        token: dto.token,
        platform: dto.platform,
      },
      update: {
        userId,
        platform: dto.platform,
      },
    });

    return this.map(row);
  }

  async unregister(
    userId: string,
    dto: UnregisterDeviceTokenDto,
  ): Promise<{ removed: boolean }> {
    const existing = await this.prisma.deviceToken.findUnique({
      where: { token: dto.token },
    });

    if (!existing || existing.userId !== userId) {
      return { removed: false };
    }

    await this.prisma.deviceToken.delete({ where: { id: existing.id } });
    return { removed: true };
  }

  async listMine(userId: string): Promise<DeviceTokenSummary[]> {
    const rows = await this.prisma.deviceToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.map(row));
  }

  private map(row: {
    id: string;
    token: string;
    platform: DevicePlatform | string;
    createdAt: Date;
  }): DeviceTokenSummary {
    return {
      id: row.id,
      platform: row.platform,
      tokenPreview: maskDeviceToken(row.token),
      createdAt: row.createdAt.toISOString(),
    };
  }
}
