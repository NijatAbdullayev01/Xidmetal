import { describe, expect, it } from 'vitest';
import {
  LOCATION_GEO_SYNC_INTERVAL_MS,
  LOCATION_PING_SAMPLE_INTERVAL_MS,
  LOCATION_PUSH_MIN_INTERVAL_MS,
  estimateEtaSeconds,
  shouldAcceptLocationPush,
  shouldSampleLocationPing,
} from '@xidmetal/shared';

describe('location push throttle', () => {
  it('ilk push qəbul olunur', () => {
    expect(shouldAcceptLocationPush(null, 1_000)).toBe(true);
  });

  it('intervaldən əvvəl rədd', () => {
    const t0 = 10_000;
    expect(shouldAcceptLocationPush(t0, t0 + LOCATION_PUSH_MIN_INTERVAL_MS - 1)).toBe(false);
  });

  it('intervaldən sonra qəbul', () => {
    const t0 = 10_000;
    expect(shouldAcceptLocationPush(t0, t0 + LOCATION_PUSH_MIN_INTERVAL_MS)).toBe(true);
  });
});

describe('location ping sampling', () => {
  it('ilk sample yazılır', () => {
    expect(shouldSampleLocationPing(undefined, Date.now())).toBe(true);
  });

  it('sample intervalə riayət', () => {
    const t0 = 50_000;
    expect(shouldSampleLocationPing(t0, t0 + LOCATION_PING_SAMPLE_INTERVAL_MS - 1)).toBe(false);
    expect(shouldSampleLocationPing(t0, t0 + LOCATION_PING_SAMPLE_INTERVAL_MS)).toBe(true);
  });
});

describe('location geo sync interval constant', () => {
  it('geo sync ≥ push interval (DB yazısı seyrək)', () => {
    expect(LOCATION_GEO_SYNC_INTERVAL_MS).toBeGreaterThanOrEqual(
      LOCATION_PUSH_MIN_INTERVAL_MS,
    );
  });
});

describe('estimateEtaSeconds', () => {
  it('sıfır məsafə → ETA 0', () => {
    const p = { lat: 40.4, lng: 49.8 };
    const { distanceMeters, etaSeconds } = estimateEtaSeconds(p, p);
    expect(distanceMeters).toBe(0);
    expect(etaSeconds).toBe(0);
  });

  it('müsbət məsafə → müsbət ETA', () => {
    const { distanceMeters, etaSeconds } = estimateEtaSeconds(
      { lat: 40.4093, lng: 49.8671 },
      { lat: 40.42, lng: 49.88 },
    );
    expect(distanceMeters).toBeGreaterThan(500);
    expect(etaSeconds).toBeGreaterThan(0);
  });
});
