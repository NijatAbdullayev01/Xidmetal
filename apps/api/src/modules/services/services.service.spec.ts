import { describe, expect, it, vi } from 'vitest';
import { ServicesService } from './services.service';
import { hashServiceRevisionListing, listingFromService } from './service-revision.util';

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

describe('ServicesService.findAll', () => {
  it('title və Bakı location filtrini şəhər etiketləri ilə qurur', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const service = new ServicesService(
      {
        service: { findMany, count },
        review: { groupBy: vi.fn().mockResolvedValue([]) },
      } as never,
      { toReadableMediaUrl: vi.fn(async (u: string | null) => u) } as never,
    );

    await service.findAll({
      page: 1,
      limit: 50,
      categoryId: 'cat-1',
      title: 'Ev və ofis təmizliyi',
      location: 'Bakı',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categoryId: 'cat-1',
          title: 'Ev və ofis təmizliyi',
          location: expect.objectContaining({
            in: expect.arrayContaining(['Bakı', 'Bakı, Binəqədi rayonu']),
          }),
        }),
      }),
    );
  });
});

describe('ServicesService.submitForReview', () => {
  const listing = {
    title: 'Xalça təmizliyi',
    description: 'Xalça təmizləyirəm əla edirəm',
    price: { toNumber: () => 15, toString: () => '15' },
    priceUnit: 'PER_SQM',
    location: 'Bakı',
    isRemote: false,
    serviceVenue: null as string | null,
    vehicleLength: null as number | null,
    vehicleWidth: null as number | null,
    vehicleHeight: null as number | null,
    cargoRouteScope: null as string | null,
    categoryId: 'cat-1',
  };
  const images = [{ id: 'img-1', url: 'https://cdn.example/a.jpg', alt: null, sortOrder: 0 }];
  const baseline = hashServiceRevisionListing(
    listingFromService(listing, images.map((image) => image.url)),
  );

  function createSut(findUnique: ReturnType<typeof vi.fn>, update: ReturnType<typeof vi.fn>) {
    return new ServicesService(
      {
        service: { findUnique, update },
        providerProfile: { findUnique: vi.fn().mockResolvedValue({ isVerified: true }) },
      } as never,
      { toReadableMediaUrl: vi.fn(async (url: string | null) => url) } as never,
    );
  }

  it('düzəliş edilmədən NEEDS_REVISION xidməti yoxlamaya göndərməyə icazə vermir', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'svc-1',
      providerId: 'provider-1',
      status: 'NEEDS_REVISION',
      reviewNote: 'duzelişi etməmisən',
      submittedAt: null,
      reviewedAt: new Date(),
      revisionBaselineHash: baseline,
      revisionEditedAt: null,
      createdAt: new Date(),
      category: { id: 'cat-1', name: 'Təmizlik', slug: 'temizlik', isActive: true },
      images,
      ...listing,
    });
    const service = createSut(findUnique, vi.fn());

    await expect(service.submitForReview('svc-1', 'provider-1')).rejects.toMatchObject({
      message: 'Yoxlamaya göndərmək üçün əvvəlcə adminin tələb etdiyi düzəlişi edin və yadda saxlayın',
    });
  });

  it('məzmun dəyişəndən sonra yoxlamaya göndərir', async () => {
    const editedListing = {
      ...listing,
      description: 'Xalça təmizləyirəm, düzəlişi etdim',
    };
    const found = {
      id: 'svc-1',
      providerId: 'provider-1',
      status: 'NEEDS_REVISION',
      reviewNote: 'duzelişi etməmisən',
      submittedAt: null,
      reviewedAt: new Date(),
      revisionBaselineHash: baseline,
      revisionEditedAt: new Date(),
      createdAt: new Date(),
      category: { id: 'cat-1', name: 'Təmizlik', slug: 'temizlik', isActive: true },
      images,
      ...editedListing,
    };
    const findUnique = vi.fn().mockResolvedValue(found);
    const update = vi.fn().mockResolvedValue({
      ...found,
      status: 'PENDING_REVIEW',
      revisionBaselineHash: null,
      revisionEditedAt: null,
    });
    const service = createSut(findUnique, update);

    const result = await service.submitForReview('svc-1', 'provider-1');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING_REVIEW',
          revisionBaselineHash: null,
          revisionEditedAt: null,
        }),
      }),
    );
    expect(result.status).toBe('PENDING_REVIEW');
  });
});

