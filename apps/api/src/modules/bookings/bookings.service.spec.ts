import { describe, expect, it, vi } from 'vitest';
import {
  BookingStatus,
  BookingType,
  UserRole,
} from '@xidmetal/shared';
import { BookingsService } from './bookings.service';

function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'b1',
    orderNumber: 'XM-26-000001',
    serviceId: 's1',
    service: { title: 'Təmir' },
    customerId: 'cust-1',
    customer: { firstName: 'A', lastName: 'B', email: 'a@example.com' },
    providerId: 'prov-1',
    provider: {
      firstName: 'X',
      lastName: 'Y',
      email: 'x@example.com',
      providerProfile: { rating: 4.5, reviewCount: 12 },
    },
    scheduledAt: new Date('2026-09-01T10:00:00.000Z'),
    proposedScheduledAt: null,
    status: BookingStatus.CONFIRMED,
    type: BookingType.SCHEDULED,
    totalPrice: { toNumber: () => 50 },
    notes: null,
    address: null,
    destLat: null,
    destLng: null,
    originLat: null,
    originLng: null,
    imageUrl: null,
    cancelReason: null,
    cancelledBy: null,
    cancelledAt: null,
    acceptedAt: null,
    enRouteAt: null,
    arrivedAt: null,
    startedAt: null,
    completedAt: null,
    review: null,
    createdAt: new Date('2026-08-01T10:00:00.000Z'),
    ...overrides,
  };
}

function makeService(prisma: unknown) {
  return new BookingsService(
    prisma as never,
    {} as never,
    { toReadableMediaUrl: vi.fn(async (url: string | null) => url) } as never,
    {} as never,
    {} as never,
    { findExisting: vi.fn() } as never,
  );
}

describe('BookingsService.findById', () => {
  it('tapılmayan sifariş üçün NotFound atır', async () => {
    const service = makeService({
      booking: { findUnique: vi.fn().mockResolvedValue(null) },
    });

    await expect(
      service.findById('missing', 'cust-1', UserRole.CUSTOMER),
    ).rejects.toThrow('Sifariş tapılmadı');
  });

  it('iştirakçı olmayan müştəriyə icazə vermir', async () => {
    const service = makeService({
      booking: { findUnique: vi.fn().mockResolvedValue(bookingRow()) },
    });

    await expect(
      service.findById('b1', 'stranger', UserRole.CUSTOMER),
    ).rejects.toThrow('Sifariş tapılmadı');
  });

  it('müştəri iştirakçısına sifarişi qaytarır', async () => {
    const service = makeService({
      booking: { findUnique: vi.fn().mockResolvedValue(bookingRow()) },
    });

    const result = await service.findById('b1', 'cust-1', UserRole.CUSTOMER);
    expect(result.id).toBe('b1');
    expect(result.orderNumber).toBe('XM-26-000001');
    expect(result.customerId).toBe('cust-1');
    expect(result.status).toBe(BookingStatus.CONFIRMED);
    expect(result.providerRating).toBe(4.5);
    expect(result.providerReviewCount).toBe(12);
  });

  it('sifariş nömrəsi ilə tapır', async () => {
    const findUnique = vi.fn().mockResolvedValue(bookingRow());
    const service = makeService({
      booking: { findUnique },
    });

    const result = await service.findById(
      'xm-26-000001',
      'cust-1',
      UserRole.CUSTOMER,
    );
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderNumber: 'XM-26-000001' },
      }),
    );
    expect(result.orderNumber).toBe('XM-26-000001');
  });
});

describe('BookingsService.updateStatus', () => {
  it('ləğv səbəbi olmadan CANCELLED qəbul etmir', async () => {
    const service = makeService({
      booking: { findUnique: vi.fn().mockResolvedValue(bookingRow()) },
    });

    await expect(
      service.updateStatus('b1', 'cust-1', UserRole.CUSTOMER, {
        status: BookingStatus.CANCELLED,
      }),
    ).rejects.toThrow('Ləğv səbəbi tələb olunur');
  });

  it('ani PENDING sifarişi status PATCH ilə təsdiqləməyə icazə vermir', async () => {
    const service = makeService({
      booking: {
        findUnique: vi.fn().mockResolvedValue(
          bookingRow({
            status: BookingStatus.PENDING,
            type: BookingType.INSTANT,
            acceptedAt: null,
          }),
        ),
      },
    });

    await expect(
      service.updateStatus('b1', 'prov-1', UserRole.PROVIDER, {
        status: BookingStatus.CONFIRMED,
      }),
    ).rejects.toThrow('Bu sifarişi idarə etmək icazəniz yoxdur');
  });

  it('idarəçiyə status dəyişməyə icazə vermir', async () => {
    const service = makeService({
      booking: { findUnique: vi.fn().mockResolvedValue(bookingRow()) },
    });

    await expect(
      service.updateStatus('b1', 'admin-1', UserRole.ADMIN, {
        status: BookingStatus.CANCELLED,
        cancelReason: 'Admin ləğvi',
      }),
    ).rejects.toThrow('İdarəçi sifarişə müdaxilə edə bilməz');
  });
});

describe('BookingsService.create', () => {
  it('ani sifariş üçün Idempotency-Key tələb edir', async () => {
    const service = makeService({});

    await expect(
      service.create('cust-1', {
        serviceId: 's1',
        notes: 'Təcili təmir',
        type: BookingType.INSTANT,
        destLat: 40.4,
        destLng: 49.8,
      }),
    ).rejects.toThrow('Təcili sifariş üçün Idempotency-Key başlığı məcburidir');
  });

  it('planlı sifariş üçün tarix tələb edir', async () => {
    const service = makeService({});

    await expect(
      service.create('cust-1', {
        serviceId: 's1',
        notes: 'Planlı təmir',
        type: BookingType.SCHEDULED,
      }),
    ).rejects.toThrow('Sifariş tarixi tələb olunur');
  });
});

describe('BookingsService.skipProvider', () => {
  it('iştirakçı olmayan müştəriyə icazə vermir', async () => {
    const service = makeService({
      booking: {
        findUnique: vi.fn().mockResolvedValue(
          bookingRow({
            status: BookingStatus.CONFIRMED,
            type: BookingType.INSTANT,
            acceptedAt: new Date(),
          }),
        ),
      },
    });

    await expect(
      service.skipProvider('b1', 'stranger', UserRole.CUSTOMER),
    ).rejects.toThrow('Bu sifarişi idarə etmək icazəniz yoxdur');
  });

  it('idarəçiyə skip icazəsi vermir', async () => {
    const service = makeService({
      booking: {
        findUnique: vi.fn().mockResolvedValue(
          bookingRow({
            status: BookingStatus.CONFIRMED,
            type: BookingType.INSTANT,
            acceptedAt: new Date(),
          }),
        ),
      },
    });

    await expect(
      service.skipProvider('b1', 'admin-1', UserRole.ADMIN),
    ).rejects.toThrow('İdarəçi sifarişə müdaxilə edə bilməz');
  });

  it('dispatch yoxdursa xəta verir', async () => {
    const service = makeService({
      booking: {
        findUnique: vi.fn().mockResolvedValue(
          bookingRow({
            status: BookingStatus.CONFIRMED,
            type: BookingType.INSTANT,
            acceptedAt: new Date(),
          }),
        ),
      },
    });

    await expect(
      service.skipProvider('b1', 'cust-1', UserRole.CUSTOMER),
    ).rejects.toThrow('Axtarış hazırda əlçatan deyil');
  });
});

describe('BookingsService.findAll', () => {
  function listPrisma() {
    return {
      booking: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    };
  }

  it('müştəri siyahısında sifariş nömrəsini status ilə AND edir', async () => {
    const prisma = listPrisma();
    const service = makeService(prisma);

    await service.findAll(
      'cust-1',
      UserRole.CUSTOMER,
      1,
      20,
      BookingStatus.COMPLETED,
      undefined,
      'XM-26-000421',
    );

    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { customerId: 'cust-1', status: BookingStatus.COMPLETED },
            { orderNumber: 'XM-26-000421' },
          ],
        },
      }),
    );
  });

  it('xidmət verən siyahısında axtarışı mövcud görünürlük filtri üzərinə qoyur', async () => {
    const prisma = listPrisma();
    const service = makeService(prisma);

    await service.findAll(
      'prov-1',
      UserRole.PROVIDER,
      1,
      50,
      undefined,
      undefined,
      '421',
    );

    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            expect.objectContaining({ AND: expect.any(Array) }),
            {
              orderNumber: { contains: '421', mode: 'insensitive' },
            },
          ],
        },
      }),
    );
  });

  it('axtarış yoxdursa where strukturunu dəyişmir', async () => {
    const prisma = listPrisma();
    const service = makeService(prisma);

    await service.findAll('cust-1', UserRole.CUSTOMER, 1, 20);

    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerId: 'cust-1' },
      }),
    );
  });
});
