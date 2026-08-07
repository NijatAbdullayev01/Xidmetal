import { describe, expect, it } from 'vitest';
import {
  haversineDistanceMeters,
  isValidCoordinates,
  isValidHeading,
  kmToMeters,
} from '@xidmetal/shared';
import {
  buildStDistanceSelect,
  buildStDWithinPredicate,
  nearbyRadiusMeters,
} from './geo-query';

describe('geo helpers (shared)', () => {
  it('validates coordinates', () => {
    expect(isValidCoordinates(40.4093, 49.8671)).toBe(true);
    expect(isValidCoordinates(91, 0)).toBe(false);
    expect(isValidHeading(180)).toBe(true);
    expect(isValidHeading(400)).toBe(false);
  });

  it('haversine distance around Baku', () => {
    const d = haversineDistanceMeters(
      { lat: 40.4093, lng: 49.8671 },
      { lat: 40.41, lng: 49.87 },
    );
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(500);
    expect(kmToMeters(5)).toBe(5_000);
  });
});

describe('geo-query builders', () => {
  it('nearbyRadiusMeters', () => {
    expect(nearbyRadiusMeters(10)).toBe(10_000);
  });

  it('ST_DWithin predicate includes geography cast', () => {
    const sql = buildStDWithinPredicate('pp');
    expect(sql).toContain('ST_DWithin');
    expect(sql).toContain('::geography');
    expect(sql).toContain('pp.last_location');
  });

  it('ST_Distance select', () => {
    const sql = buildStDistanceSelect('pp');
    expect(sql).toContain('ST_Distance');
    expect(sql).toContain('distance_m');
  });
});
