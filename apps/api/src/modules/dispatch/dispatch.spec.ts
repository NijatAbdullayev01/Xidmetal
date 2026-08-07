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

  it('INSTANT requires dest coords and allows omitting scheduledAt', async () => {
    const { createBookingSchema, BookingType } = await import('@xidmetal/shared');
    const ok = createBookingSchema.safeParse({
      serviceId: '11111111-1111-1111-1111-111111111111',
      notes: 'İndi gəlin',
      type: BookingType.INSTANT,
      destLat: 40.4093,
      destLng: 49.8671,
      address: 'Bakı',
    });
    expect(ok.success).toBe(true);

    const noCoords = createBookingSchema.safeParse({
      serviceId: '11111111-1111-1111-1111-111111111111',
      notes: 'İndi gəlin',
      type: BookingType.INSTANT,
    });
    expect(noCoords.success).toBe(false);
  });
});
