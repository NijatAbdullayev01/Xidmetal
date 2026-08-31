import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService.findPublicProvider', () => {
  it('təsdiqlənmiş xidmət verəni PII-siz qaytarır', async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: 'p-1',
      firstName: 'Aysel',
      lastName: 'Məmmədova',
      avatarUrl: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      providerProfile: {
        bio: 'Təmizlik üzrə 5 il',
        experience: 5,
        location: 'Bakı',
        accountType: 'INDIVIDUAL',
        companyName: null,
        rating: 4.8,
        reviewCount: 12,
      },
    });

    const service = new UsersService(
      { user: { findFirst } } as never,
      {} as never,
      { toReadableMediaUrl: vi.fn(async (url: string | null) => url) } as never,
      {} as never,
    );

    const result = await service.findPublicProvider('p-1');
    expect(result.displayName).toBe('Aysel Məmmədova');
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('phone');
    expect(result.rating).toBe(4.8);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'p-1',
          providerProfile: { isVerified: true },
        }),
      }),
    );
  });

  it('tapılmayanda 404 atır', async () => {
    const service = new UsersService(
      { user: { findFirst: vi.fn().mockResolvedValue(null) } } as never,
      {} as never,
      { toReadableMediaUrl: vi.fn() } as never,
      {} as never,
    );

    await expect(service.findPublicProvider('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
