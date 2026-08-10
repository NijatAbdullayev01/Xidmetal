import { describe, expect, it } from 'vitest';
import { NominatimGeocoder } from './geocoder';
import type { ConfigService } from '@nestjs/config';

function makeConfig(values: Record<string, string | undefined>) {
  return {
    get<T extends string>(key: string, defaultValue?: T): T | undefined {
      const value = values[key];
      return (value ?? defaultValue) as T | undefined;
    },
  } satisfies Pick<ConfigService, 'get'>;
}

describe('NominatimGeocoder', () => {
  it('yalnız https base URL qəbul edir', () => {
    expect(
      () =>
        new NominatimGeocoder(
          makeConfig({
            GEOCODER_BASE_URL: 'http://nominatim.openstreetmap.org',
          }) as ConfigService,
        ),
    ).toThrow(/https/);
  });

  it('allowlist-dən kənar hostu rədd edir', () => {
    expect(
      () =>
        new NominatimGeocoder(
          makeConfig({
            GEOCODER_BASE_URL: 'https://evil.example',
            GEOCODER_ALLOWED_HOSTS: 'nominatim.openstreetmap.org',
          }) as ConfigService,
        ),
    ).toThrow(/host/);
  });
});
