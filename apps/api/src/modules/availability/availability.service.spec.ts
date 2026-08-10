import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ServiceStatus } from '@prisma/client';
import { AvailabilityService } from './availability.service';
import type { PrismaService } from '../../common/database/prisma.service';

describe('AvailabilityService.resolvePublicSlots', () => {
  it('public endpoint üçün yalnız serviceId scope-u ilə bookingləri sorğulayır', async () => {
    const bookingFindMany = vi.fn().mockResolvedValue([]);
    const service = new AvailabilityService({
      service: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'service-1',
          providerId: 'provider-1',
          duration: 60,
          status: ServiceStatus.ACTIVE,
          category: { isActive: true },
          provider: { providerProfile: { isVerified: true } },
        }),
      },
      serviceWorkingHours: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      serviceAvailabilityOverride: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      booking: {
        findMany: bookingFindMany,
      },
    } as unknown as PrismaService);

    await service.resolvePublicSlots('service-1', '2026-08-10', '2026-08-10');

    expect(bookingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          serviceId: 'service-1',
          status: expect.any(Object),
          scheduledAt: expect.any(Object),
        }),
      }),
    );
    expect(bookingFindMany.mock.calls[0]?.[0]?.where).not.toHaveProperty('providerId');
  });

  it('inactive xidməti public olaraq gizlədir', async () => {
    const service = new AvailabilityService({
      service: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'service-2',
          providerId: 'provider-2',
          duration: 60,
          status: ServiceStatus.DRAFT,
          category: { isActive: true },
          provider: { providerProfile: { isVerified: true } },
        }),
      },
    } as unknown as PrismaService);

    await expect(
      service.resolvePublicSlots('service-2', '2026-08-10', '2026-08-10'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
