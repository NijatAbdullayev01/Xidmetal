import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GeocodeResult } from '@xidmetal/shared';

export interface GeocoderAdapter {
  geocode(query: string): Promise<GeocodeResult[]>;
  reverse(lat: number, lng: number): Promise<GeocodeResult | null>;
}

/** Dev / API key olmadan — Bakı stub */
@Injectable()
export class MockGeocoder implements GeocoderAdapter {
  async geocode(query: string): Promise<GeocodeResult[]> {
    const q = query.trim();
    return [
      {
        lat: 40.4093,
        lng: 49.8671,
        displayName: q || 'Bakı, Azərbaycan (mock)',
        provider: 'mock',
      },
    ];
  }

  async reverse(lat: number, lng: number): Promise<GeocodeResult | null> {
    return {
      lat,
      lng,
      // Koordinat yox — oxuna bilən stub (prod-da mock qadağandır)
      displayName: 'Bakı, Azərbaycan',
      provider: 'mock',
    };
  }
}

/** OSM Nominatim — rate-limit + User-Agent tələb olunur; API key yox */
@Injectable()
export class NominatimGeocoder implements GeocoderAdapter {
  private readonly logger = new Logger(NominatimGeocoder.name);
  private readonly baseUrl: string;
  private readonly userAgent: string;

  constructor(private config: ConfigService) {
    this.baseUrl = (
      this.config.get<string>('GEOCODER_BASE_URL')?.trim() ||
      'https://nominatim.openstreetmap.org'
    ).replace(/\/$/, '');
    this.userAgent =
      this.config.get<string>('GEOCODER_USER_AGENT')?.trim() ||
      'Xidmetal/1.0 (geo@xidmetal.com)';
    this.assertAllowedBaseUrl();
  }

  async geocode(query: string): Promise<GeocodeResult[]> {
    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '5');
    // Azərbaycan nəticələrini prioritetləşdir (OSM Nominatim)
    url.searchParams.set('countrycodes', 'az');
    url.searchParams.set('accept-language', 'az');

    const rows = await this.fetchJson<NominatimSearchRow[]>(url);
    return rows.map((row) => ({
      lat: Number(row.lat),
      lng: Number(row.lon),
      displayName: row.display_name,
      provider: 'nominatim',
    }));
  }

  async reverse(lat: number, lng: number): Promise<GeocodeResult | null> {
    const url = new URL(`${this.baseUrl}/reverse`);
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('format', 'json');
    url.searchParams.set('accept-language', 'az');

    const row = await this.fetchJson<NominatimSearchRow | { error?: string }>(url);
    if ('error' in row && row.error) return null;
    if (!('lat' in row) || !('lon' in row)) return null;

    return {
      lat: Number(row.lat),
      lng: Number(row.lon),
      displayName: row.display_name?.trim() || 'Naməlum ünvan',
      provider: 'nominatim',
    };
  }

  private async fetchJson<T>(url: URL): Promise<T> {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': this.userAgent,
        },
        signal: AbortSignal.timeout(8_000),
        redirect: 'error',
      });
      if (!res.ok) {
        this.logger.warn(`Nominatim HTTP ${res.status}`);
        return [] as T;
      }
      return (await res.json()) as T;
    } catch (error) {
      this.logger.warn(
        `Nominatim xəta: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [] as T;
    }
  }

  private assertAllowedBaseUrl(): void {
    const parsed = new URL(this.baseUrl);
    if (parsed.protocol !== 'https:') {
      throw new Error('GEOCODER_BASE_URL yalnız https ola bilər');
    }

    const allowedHosts = (
      this.config.get<string>('GEOCODER_ALLOWED_HOSTS')?.trim() ||
      'nominatim.openstreetmap.org'
    )
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);

    if (!allowedHosts.includes(parsed.hostname.toLowerCase())) {
      throw new Error('GEOCODER_BASE_URL təsdiqlənmiş host siyahısında deyil');
    }
  }
}

interface NominatimSearchRow {
  lat: string;
  lon: string;
  display_name: string;
}

export const GEOCODER_ADAPTER = Symbol('GEOCODER_ADAPTER');

export function createGeocoderAdapter(config: ConfigService): GeocoderAdapter {
  const provider = (config.get<string>('GEOCODER_PROVIDER')?.trim() || 'mock').toLowerCase();
  if (provider === 'nominatim') {
    return new NominatimGeocoder(config);
  }
  return new MockGeocoder();
}
