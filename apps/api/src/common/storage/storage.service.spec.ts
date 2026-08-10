import { describe, expect, it, vi } from 'vitest';
import { StorageService } from './storage.service';
import type { PrismaService } from '../database/prisma.service';
import type { ConfigService } from '@nestjs/config';

function makeConfig(values: Record<string, string | undefined>) {
  return {
    get<T extends string>(key: string, defaultValue?: T): T | undefined {
      const value = values[key];
      return (value ?? defaultValue) as T | undefined;
    },
    getOrThrow<T extends string>(key: string): T {
      const value = values[key];
      if (!value) throw new Error(`Missing ${key}`);
      return value as T;
    },
  } satisfies Pick<ConfigService, 'get' | 'getOrThrow'>;
}

describe('StorageService.assertOwnedUploadUrl', () => {
  it('yalnız öz booking upload-unu qəbul edir və canonical URL qaytarır', async () => {
    const prisma = {
      uploadedObject: {
        findFirst: vi.fn().mockResolvedValue({ id: 'u1' }),
      },
    } as unknown as PrismaService;
    const service = new StorageService(
      makeConfig({
        STORAGE_DRIVER: 'local',
        API_URL: 'http://localhost:4000',
        STORAGE_PUBLIC_BASE_URL: 'http://localhost:4000/uploads',
      }) as ConfigService,
      prisma,
    );

    await expect(
      service.assertOwnedUploadUrl(
        'http://localhost:4000/uploads/bookings/file.jpg?exp=1&sig=abc',
        'bookings',
        'customer-1',
      ),
    ).resolves.toBe('http://localhost:4000/uploads/bookings/file.jpg');

    expect(prisma.uploadedObject.findFirst).toHaveBeenCalledWith({
      where: {
        url: 'http://localhost:4000/uploads/bookings/file.jpg',
        folder: 'bookings',
        userId: 'customer-1',
      },
      select: { id: true },
    });
  });

  it('başqa istifadəçinin upload-unu rədd edir', async () => {
    const prisma = {
      uploadedObject: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;
    const service = new StorageService(
      makeConfig({
        STORAGE_DRIVER: 'local',
        API_URL: 'http://localhost:4000',
        STORAGE_PUBLIC_BASE_URL: 'http://localhost:4000/uploads',
      }) as ConfigService,
      prisma,
    );

    await expect(
      service.assertOwnedUploadUrl(
        'http://localhost:4000/uploads/bookings/file.jpg',
        'bookings',
        'customer-2',
      ),
    ).rejects.toThrow('Şəkil yalnız öz yükləmənizdən seçilə bilər');
  });
});
