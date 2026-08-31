import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ProviderAccountType, ServiceStatus } from '@prisma/client';
import { AvailabilityService } from './availability.service';
import type { PrismaService } from '../../common/database/prisma.service';
import type { ServiceCapacityService } from '../../common/booking/service-capacity.service';

function mockCapacity(): ServiceCapacityService {
  return {
    resolveContext: vi.fn().mockResolvedValue({
      serviceId: 'service-1',
      providerId: 'provider-1',
      accountType: ProviderAccountType.INDIVIDUAL,
      durationMinutes: 60,
      teamCount: 1,
      capacity: 1,
      teams: [{ id: 'team-1', name: 'Komanda 1' }],
    }),
    loadOccupancyWindows: vi.fn().mockResolvedValue([]),
    isBusyAt: vi.fn().mockReturnValue(false),
  } as unknown as ServiceCapacityService;
}

describe('AvailabilityService.resolvePublicSlots', () => {
  it('ictimai slotlar üçün tutum kontekstini yükləyir', async () => {
    const capacity = mockCapacity();
    const service = new AvailabilityService(
      {
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
      } as unknown as PrismaService,
      capacity,
    );

    await service.resolvePublicSlots('service-1', '2026-08-10', '2026-08-10');

    expect(capacity.resolveContext).toHaveBeenCalledWith(
      'service-1',
      expect.anything(),
    );
    expect(capacity.loadOccupancyWindows).toHaveBeenCalled();
  });

  it('inactive xidməti public olaraq gizlədir', async () => {
    const service = new AvailabilityService(
      {
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
      } as unknown as PrismaService,
      mockCapacity(),
    );

    await expect(
      service.resolvePublicSlots('service-2', '2026-08-10', '2026-08-10'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
