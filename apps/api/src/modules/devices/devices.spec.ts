import { describe, expect, it, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import {
  isValidDeviceTokenShape,
  maskDeviceToken,
} from './device-token.helpers';
import { DevicesService } from './devices.service';

describe('device-token helpers', () => {
  it('qısa token etibarsızdır', () => {
    expect(isValidDeviceTokenShape('short')).toBe(false);
  });

  it('uzun ASCII token keçərlidir', () => {
    const token = 'a'.repeat(152);
    expect(isValidDeviceTokenShape(token)).toBe(true);
  });

  it('whitespace olan token keçərsizdir', () => {
    expect(isValidDeviceTokenShape(`abc ${'x'.repeat(40)}`)).toBe(false);
  });

  it('maskDeviceToken preview verir', () => {
    const token = 'abcdefghijklmnop';
    expect(maskDeviceToken(token)).toBe('abcdef…mnop');
  });
});

describe('DevicesService ownership', () => {
  it('başqa user-in tokenini oğurlamağa icazə vermir', async () => {
    const token = 'a'.repeat(152);
    const prisma = {
      deviceToken: {
        findUnique: vi.fn(async () => ({ id: 'd1', userId: 'other' })),
        upsert: vi.fn(),
      },
    };
    const svc = new DevicesService(prisma as never);
    await expect(
      svc.register('me', { token, platform: 'WEB' as never }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.deviceToken.upsert).not.toHaveBeenCalled();
  });

  it('öz tokenini yeniləyə bilər', async () => {
    const token = 'a'.repeat(152);
    const prisma = {
      deviceToken: {
        findUnique: vi.fn(async () => ({ id: 'd1', userId: 'me' })),
        upsert: vi.fn(async () => ({
          id: 'd1',
          token,
          platform: 'WEB',
          createdAt: new Date(),
        })),
      },
    };
    const svc = new DevicesService(prisma as never);
    const row = await svc.register('me', { token, platform: 'WEB' as never });
    expect(row.id).toBe('d1');
    expect(prisma.deviceToken.upsert).toHaveBeenCalled();
  });
});
