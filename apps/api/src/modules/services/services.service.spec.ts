import { describe, expect, it, vi } from 'vitest';
import { ServicesService } from './services.service';

describe('ServicesService.findMine', () => {
  it('axtarış filtrini title/description/location/category üzrə qurur', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const service = new ServicesService(
      {
        service: { findMany, count },
        booking: { groupBy: vi.fn().mockResolvedValue([]) },
        review: { groupBy: vi.fn().mockResolvedValue([]) },
      } as never,
      { toReadableMediaUrl: vi.fn(async (u: string | null) => u) } as never,
    );

    await service.findMine('provider-1', {
      page: 1,
      limit: 10,
      search: 'təmir',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          providerId: 'provider-1',
          OR: expect.arrayContaining([
            expect.objectContaining({
              title: { contains: 'təmir', mode: 'insensitive' },
            }),
          ]),
        }),
      }),
    );
    expect(count).toHaveBeenCalled();
  });
});
