import { describe, expect, it } from 'vitest';
import {
  computeDispatchScore,
  rankDispatchCandidates,
  resolveAcceptRaceWinners,
  selectNextDispatchCandidate,
  type DispatchCandidate,
} from '@xidmetal/shared';

describe('dispatch ranking', () => {
  const candidates: DispatchCandidate[] = [
    { providerId: 'far-high', distanceM: 5000, rating: 5 },
    { providerId: 'near-low', distanceM: 500, rating: 3 },
    { providerId: 'near-high', distanceM: 500, rating: 4.5 },
    { providerId: 'mid', distanceM: 2000, rating: 4 },
  ];

  it('sorts by distance asc then rating desc', () => {
    const ranked = rankDispatchCandidates(candidates);
    expect(ranked.map((c) => c.providerId)).toEqual([
      'near-high',
      'near-low',
      'mid',
      'far-high',
    ]);
  });

  it('selects next excluding prior offers', () => {
    const ranked = rankDispatchCandidates(candidates);
    const exclude = new Set(['near-high', 'near-low']);
    const next = selectNextDispatchCandidate(ranked, exclude);
    expect(next?.providerId).toBe('mid');
  });

  it('returns null when all exhausted', () => {
    const ranked = rankDispatchCandidates(candidates);
    const exclude = new Set(candidates.map((c) => c.providerId));
    expect(selectNextDispatchCandidate(ranked, exclude)).toBeNull();
  });

  it('computes score preferring rating and proximity', () => {
    expect(computeDispatchScore(100, 5)).toBeGreaterThan(
      computeDispatchScore(5000, 5),
    );
    expect(computeDispatchScore(100, 5)).toBeGreaterThan(
      computeDispatchScore(100, 3),
    );
  });
});

describe('dispatch accept race', () => {
  it('only one winner when two providers race', () => {
    // Simulates sequential conditional updates: first sees pending, second sees taken
    const winners = resolveAcceptRaceWinners([
      { offerPending: true, bookingPending: true },
      { offerPending: true, bookingPending: false },
    ]);
    expect(winners).toBe(1);
  });

  it('zero winners if booking already confirmed', () => {
    const winners = resolveAcceptRaceWinners([
      { offerPending: true, bookingPending: false },
      { offerPending: true, bookingPending: false },
    ]);
    expect(winners).toBe(0);
  });

  it('expired offer cannot win', () => {
    const winners = resolveAcceptRaceWinners([
      { offerPending: false, bookingPending: true },
    ]);
    expect(winners).toBe(0);
  });
});

describe('dispatch redispatch exclusion', () => {
  it('excludes PENDING and ACCEPTED providers', async () => {
    const { providersExcludedFromRedispatch } = await import('@xidmetal/shared');
    const exclude = providersExcludedFromRedispatch([
      { providerId: 'a', status: 'PENDING' },
      { providerId: 'b', status: 'ACCEPTED', respondedAt: new Date() },
      { providerId: 'c', status: 'CANCELLED', respondedAt: new Date() },
      { providerId: 'd', status: 'SKIPPED', respondedAt: new Date() },
    ]);
    expect(exclude.has('a')).toBe(true);
    expect(exclude.has('b')).toBe(true);
    expect(exclude.has('c')).toBe(false);
    expect(exclude.has('d')).toBe(true);
    expect(exclude.has('new')).toBe(false);
  });

  it('excludes REJECTED provider during cooldown, allows after', async () => {
    const { providersExcludedFromRedispatch, DISPATCH } = await import(
      '@xidmetal/shared'
    );
    const rejectedAt = new Date('2026-08-11T10:00:00.000Z');
    const duringCooldown = new Date(
      rejectedAt.getTime() +
        (DISPATCH.DECLINE_REOFFER_COOLDOWN_SEC - 5) * 1000,
    );
    const afterCooldown = new Date(
      rejectedAt.getTime() + DISPATCH.DECLINE_REOFFER_COOLDOWN_SEC * 1000,
    );

    const during = providersExcludedFromRedispatch(
      [{ providerId: 'p1', status: 'REJECTED', respondedAt: rejectedAt }],
      { now: duringCooldown },
    );
    expect(during.has('p1')).toBe(true);

    const after = providersExcludedFromRedispatch(
      [{ providerId: 'p1', status: 'REJECTED', respondedAt: rejectedAt }],
      { now: afterCooldown },
    );
    expect(after.has('p1')).toBe(false);
  });

  it('re-excludes after a newer REJECTED while older cooldown elapsed', async () => {
    const { providersExcludedFromRedispatch } = await import('@xidmetal/shared');
    const first = new Date('2026-08-11T10:00:00.000Z');
    const second = new Date('2026-08-11T10:03:00.000Z');
    const now = new Date('2026-08-11T10:04:00.000Z');

    const exclude = providersExcludedFromRedispatch(
      [
        { providerId: 'p1', status: 'REJECTED', respondedAt: first },
        { providerId: 'p1', status: 'REJECTED', respondedAt: second },
      ],
      { now, declineReofferCooldownSec: 120 },
    );
    expect(exclude.has('p1')).toBe(true);
  });

  it('keeps search window open until deadline', async () => {
    const { isDispatchSearchWindowOpen } = await import('@xidmetal/shared');
    const createdAt = new Date('2026-08-11T10:00:00.000Z');
    expect(
      isDispatchSearchWindowOpen(
        createdAt,
        new Date('2026-08-11T10:09:59.000Z'),
        600,
      ),
    ).toBe(true);
    expect(
      isDispatchSearchWindowOpen(
        createdAt,
        new Date('2026-08-11T10:10:00.000Z'),
        600,
      ),
    ).toBe(false);
  });

  it('skip sonrası axtarış pəncərəsi dispatchWindowStartedAt-dən sayılır', async () => {
    const { dispatchSearchWindowStart, isDispatchSearchWindowOpen } =
      await import('@xidmetal/shared');
    const createdAt = new Date('2026-08-11T10:00:00.000Z');
    const skippedAt = new Date('2026-08-11T10:12:00.000Z');
    const windowStart = dispatchSearchWindowStart(createdAt, skippedAt);
    expect(
      isDispatchSearchWindowOpen(
        windowStart,
        new Date('2026-08-11T10:15:00.000Z'),
        600,
      ),
    ).toBe(true);
    expect(
      isDispatchSearchWindowOpen(
        createdAt,
        new Date('2026-08-11T10:15:00.000Z'),
        600,
      ),
    ).toBe(false);
  });

  it('parseDispatchPrefs yalnız etibarlı ədədləri saxlayır', async () => {
    const { parseDispatchPrefs } = await import('@xidmetal/shared');
    expect(parseDispatchPrefs(null)).toBeNull();
    expect(
      parseDispatchPrefs({
        minRating: 4,
        minPrice: 10,
        maxPrice: 40,
        serviceCity: 'Bakı',
        extra: true,
      }),
    ).toEqual({
      minRating: 4,
      minPrice: 10,
      maxPrice: 40,
      serviceCity: 'Bakı',
    });
    expect(parseDispatchPrefs({ minRating: '4' })).toBeNull();
  });

  it('CONFIRMED INSTANT skippable, EN_ROUTE deyil', async () => {
    const { isInstantProviderSkippable, BookingStatus, BookingType } =
      await import('@xidmetal/shared');
    expect(
      isInstantProviderSkippable(BookingType.INSTANT, BookingStatus.CONFIRMED),
    ).toBe(true);
    expect(
      isInstantProviderSkippable(BookingType.INSTANT, BookingStatus.EN_ROUTE),
    ).toBe(false);
    expect(
      isInstantProviderSkippable(BookingType.SCHEDULED, BookingStatus.CONFIRMED),
    ).toBe(false);
  });

  it('BullMQ custom job ids must not contain colon', () => {
    const bookingId = '7d7a3b7e-a539-492e-9982-015e21441ad5';
    const providerId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const searchJobId = `search-window-${bookingId}`;
    const rediscoveryJobId = `rediscovery-${bookingId}`;
    const declineJobId = `decline-reoffer-${bookingId}-${providerId}`;
    expect(searchJobId.includes(':')).toBe(false);
    expect(rediscoveryJobId.includes(':')).toBe(false);
    expect(declineJobId.includes(':')).toBe(false);
  });
});

describe('INSTANT vs SCHEDULED create contract', () => {
  it('SCHEDULED still requires scheduledAt in schema semantics', async () => {
    const { createBookingSchema, BookingType } = await import('@xidmetal/shared');
    const scheduled = createBookingSchema.safeParse({
      serviceId: '11111111-1111-1111-1111-111111111111',
      scheduledAt: '2026-09-01T10:00:00.000Z',
      notes: 'Test',
      type: BookingType.SCHEDULED,
    });
    expect(scheduled.success).toBe(true);

    const missingDate = createBookingSchema.safeParse({
      serviceId: '11111111-1111-1111-1111-111111111111',
      notes: 'Test',
      type: BookingType.SCHEDULED,
    });
    expect(missingDate.success).toBe(false);
  });

  it('INSTANT requires address and allows omitting scheduledAt', async () => {
    const { createBookingSchema, BookingType } = await import('@xidmetal/shared');
    const ok = createBookingSchema.safeParse({
      serviceId: '11111111-1111-1111-1111-111111111111',
      notes: 'İndi gəlin',
      type: BookingType.INSTANT,
      address: 'Bakı',
    });
    expect(ok.success).toBe(true);

    const withCoords = createBookingSchema.safeParse({
      serviceId: '11111111-1111-1111-1111-111111111111',
      notes: 'İndi gəlin',
      type: BookingType.INSTANT,
      destLat: 40.4093,
      destLng: 49.8671,
      address: 'Bakı',
    });
    expect(withCoords.success).toBe(true);

    const noAddress = createBookingSchema.safeParse({
      serviceId: '11111111-1111-1111-1111-111111111111',
      notes: 'İndi gəlin',
      type: BookingType.INSTANT,
    });
    expect(noAddress.success).toBe(false);
  });

  it('qeyd opsionaldır — boş və ya yoxdursa qəbul edilir', async () => {
    const { createBookingSchema, BookingType } = await import('@xidmetal/shared');
    const omitted = createBookingSchema.safeParse({
      serviceId: '11111111-1111-1111-1111-111111111111',
      scheduledAt: '2026-09-01T10:00:00.000Z',
      type: BookingType.SCHEDULED,
    });
    expect(omitted.success).toBe(true);

    const empty = createBookingSchema.safeParse({
      serviceId: '11111111-1111-1111-1111-111111111111',
      scheduledAt: '2026-09-01T10:00:00.000Z',
      notes: '   ',
      type: BookingType.SCHEDULED,
    });
    expect(empty.success).toBe(true);
  });
});
