import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { estimateEtaSeconds, type GeoPoint } from '@xidmetal/shared';
import { resolveOsrmBaseUrl } from './osrm-url';

export type EtaSource = 'google' | 'osrm' | 'mapbox' | 'haversine';

export interface EtaEstimate {
  etaSeconds: number;
  distanceMeters: number;
  source: EtaSource;
  /** Encoded polyline — haversine-də yox */
  routePolyline?: string | null;
}

interface DirectionsCacheEntry {
  etaSeconds: number;
  distanceMeters: number;
  routePolyline: string | null;
  source: Exclude<EtaSource, 'haversine'>;
  expiresAt: number;
}

function parseGoogleDurationSeconds(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value === 'string') {
    const match = /^(\d+(?:\.\d+)?)s$/.exec(value.trim());
    if (match) return Math.max(0, Math.round(Number(match[1])));
  }
  return null;
}

/**
 * Bolt üslubu yol ETA:
 * 1) Google Routes API (New) — yalnız `GOOGLE_MAPS_API_KEY` (prod-da NEXT_PUBLIC fallback yox)
 * 2) OSRM — `OSRM_BASE_URL` (host allowlist)
 * 3) Mapbox — `MAPBOX_ACCESS_TOKEN`
 * 4) Haversine × yol əmsalı
 */
@Injectable()
export class EtaService {
  private readonly logger = new Logger(EtaService.name);
  private readonly cache = new Map<string, DirectionsCacheEntry>();
  private readonly cacheTtlMs = 30_000;

  constructor(private config: ConfigService) {}

  /** Sync cache — hot path */
  peekCached(from: GeoPoint, to: GeoPoint): EtaEstimate | null {
    const entry = this.getCachedEntry(from, to);
    if (!entry) return null;
    return {
      etaSeconds: entry.etaSeconds,
      distanceMeters: entry.distanceMeters,
      source: entry.source,
      routePolyline: entry.routePolyline,
    };
  }

  async estimate(from: GeoPoint, to: GeoPoint): Promise<EtaEstimate> {
    const cached = this.peekCached(from, to);
    if (cached) return cached;

    const googleKey = this.resolveGoogleMapsApiKey();
    if (googleKey) {
      try {
        const directed = await this.fetchGoogleRoutes(googleKey, from, to);
        if (directed) {
          this.setCached(from, to, { ...directed, source: 'google' });
          return { ...directed, source: 'google' };
        }
      } catch (error) {
        this.logger.warn(
          `Google Routes uğursuz: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    try {
      const osrm = await this.fetchOsrmRoute(from, to);
      if (osrm) {
        this.setCached(from, to, { ...osrm, source: 'osrm' });
        return { ...osrm, source: 'osrm' };
      }
    } catch (error) {
      this.logger.warn(
        `OSRM uğursuz: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const mapboxToken = this.config.get<string>('MAPBOX_ACCESS_TOKEN')?.trim();
    if (mapboxToken) {
      try {
        const directed = await this.fetchMapboxDirections(mapboxToken, from, to);
        if (directed) {
          this.setCached(from, to, { ...directed, source: 'mapbox' });
          return { ...directed, source: 'mapbox' };
        }
      } catch (error) {
        this.logger.warn(
          `Mapbox Directions uğursuz: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const fallback = estimateEtaSeconds(from, to);
    return { ...fallback, source: 'haversine', routePolyline: null };
  }

  private resolveGoogleMapsApiKey(): string | null {
    const server = this.config.get<string>('GOOGLE_MAPS_API_KEY')?.trim();
    if (server) return server;
    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');
    // Prod-da brauzer açarı ilə ödənişli Routes çağırışı yoxdur
    if (nodeEnv === 'production') return null;
    return this.config.get<string>('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')?.trim() || null;
  }

  private osrmBaseUrl(): string | null {
    return resolveOsrmBaseUrl({
      configured: this.config.get<string>('OSRM_BASE_URL'),
      allowedHosts: this.config.get<string>('OSRM_ALLOWED_HOSTS'),
    });
  }

  private cacheKey(from: GeoPoint, to: GeoPoint): string {
    const round = (n: number) => n.toFixed(4);
    return `${round(from.lat)},${round(from.lng)}→${round(to.lat)},${round(to.lng)}`;
  }

  private getCachedEntry(from: GeoPoint, to: GeoPoint): DirectionsCacheEntry | null {
    const key = this.cacheKey(from, to);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry;
  }

  private setCached(
    from: GeoPoint,
    to: GeoPoint,
    value: {
      etaSeconds: number;
      distanceMeters: number;
      routePolyline?: string | null;
      source: Exclude<EtaSource, 'haversine'>;
    },
  ): void {
    this.cache.set(this.cacheKey(from, to), {
      etaSeconds: value.etaSeconds,
      distanceMeters: value.distanceMeters,
      routePolyline: value.routePolyline ?? null,
      source: value.source,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
  }

  /** Google Routes API v2 (legacy Directions əvəzinə) */
  private async fetchGoogleRoutes(
    apiKey: string,
    from: GeoPoint,
    to: GeoPoint,
  ): Promise<{
    etaSeconds: number;
    distanceMeters: number;
    routePolyline: string | null;
  } | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
          origin: {
            location: { latLng: { latitude: from.lat, longitude: from.lng } },
          },
          destination: {
            location: { latLng: { latitude: to.lat, longitude: to.lng } },
          },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          languageCode: 'az',
          regionCode: 'AZ',
        }),
      });

      const data: unknown = await res.json().catch(() => null);
      if (!res.ok || !data || typeof data !== 'object') {
        const errMsg =
          data && typeof data === 'object'
            ? (data as { error?: { message?: string; status?: string } }).error
            : undefined;
        if (errMsg?.status || errMsg?.message) {
          this.logger.debug(
            `Google Routes: ${errMsg.status ?? res.status} ${errMsg.message ?? ''}`.trim(),
          );
        }
        return null;
      }

      const routes = (data as { routes?: unknown }).routes;
      if (!Array.isArray(routes) || routes.length === 0) return null;
      const first = routes[0];
      if (!first || typeof first !== 'object') return null;

      const etaSeconds = parseGoogleDurationSeconds(
        (first as { duration?: unknown }).duration,
      );
      const distance = (first as { distanceMeters?: unknown }).distanceMeters;
      if (etaSeconds == null || typeof distance !== 'number') return null;

      const encoded = (first as { polyline?: { encodedPolyline?: unknown } }).polyline
        ?.encodedPolyline;
      const routePolyline =
        typeof encoded === 'string' && encoded.length > 0 ? encoded : null;

      return {
        etaSeconds,
        distanceMeters: Math.max(0, Math.round(distance)),
        routePolyline,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /** OSRM — açarsız yol marşrutu (OSM). Prod-da öz OSRM və ya Google Routes. */
  private async fetchOsrmRoute(
    from: GeoPoint,
    to: GeoPoint,
  ): Promise<{
    etaSeconds: number;
    distanceMeters: number;
    routePolyline: string | null;
  } | null> {
    const base = this.osrmBaseUrl();
    if (!base) return null;

    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url =
      `${base}/route/v1/driving/${coords}` +
      '?overview=full&geometries=polyline';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        redirect: 'error',
      });
      if (!res.ok) return null;
      const data: unknown = await res.json();
      if (!data || typeof data !== 'object') return null;
      if ((data as { code?: unknown }).code !== 'Ok') return null;

      const routes = (data as { routes?: unknown }).routes;
      if (!Array.isArray(routes) || routes.length === 0) return null;
      const first = routes[0];
      if (!first || typeof first !== 'object') return null;

      const duration = (first as { duration?: unknown }).duration;
      const distance = (first as { distance?: unknown }).distance;
      if (typeof duration !== 'number' || typeof distance !== 'number') return null;

      const geometry = (first as { geometry?: unknown }).geometry;
      const routePolyline =
        typeof geometry === 'string' && geometry.length > 0 ? geometry : null;

      return {
        etaSeconds: Math.max(0, Math.round(duration)),
        distanceMeters: Math.max(0, Math.round(distance)),
        routePolyline,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private async fetchMapboxDirections(
    token: string,
    from: GeoPoint,
    to: GeoPoint,
  ): Promise<{
    etaSeconds: number;
    distanceMeters: number;
    routePolyline: string | null;
  } | null> {
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coords}` +
      `?overview=full&geometries=polyline&access_token=${encodeURIComponent(token)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4_000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return null;
      const data: unknown = await res.json();
      if (!data || typeof data !== 'object') return null;
      const routes = (data as { routes?: unknown }).routes;
      if (!Array.isArray(routes) || routes.length === 0) return null;
      const first = routes[0];
      if (!first || typeof first !== 'object') return null;
      const duration = (first as { duration?: unknown }).duration;
      const distance = (first as { distance?: unknown }).distance;
      if (typeof duration !== 'number' || typeof distance !== 'number') return null;
      const geometry = (first as { geometry?: unknown }).geometry;
      const routePolyline = typeof geometry === 'string' && geometry.length > 0 ? geometry : null;
      return {
        etaSeconds: Math.max(0, Math.round(duration)),
        distanceMeters: Math.max(0, Math.round(distance)),
        routePolyline,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
