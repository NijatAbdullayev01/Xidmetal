import { describe, expect, it } from 'vitest';
import {
  normalizeHttpRoute,
  redactPathIds,
  shouldSkipHttpMetric,
} from './route-normalize';

describe('route-normalize', () => {
  it('Nest route path + baseUrl birləşdirir', () => {
    expect(
      normalizeHttpRoute({
        baseUrl: '/api/v1/bookings',
        route: { path: '/:id' },
        path: '/api/v1/bookings/550e8400-e29b-41d4-a716-446655440000',
      }),
    ).toBe('/api/v1/bookings/:id');
  });

  it('route yoxdursa UUID/numeric id-ləri əvəz edir', () => {
    expect(
      redactPathIds(
        '/api/v1/bookings/550e8400-e29b-41d4-a716-446655440000/status',
      ),
    ).toBe('/api/v1/bookings/:id/status');
    expect(redactPathIds('/api/v1/services/42')).toBe('/api/v1/services/:id');
  });

  it('metrics və health scrape-i skip edir', () => {
    expect(shouldSkipHttpMetric('/api/v1/metrics')).toBe(true);
    expect(shouldSkipHttpMetric('/api/v1/health')).toBe(true);
    expect(shouldSkipHttpMetric('/api/v1/health/ready')).toBe(true);
    expect(shouldSkipHttpMetric('/api/v1/categories')).toBe(false);
  });
});
