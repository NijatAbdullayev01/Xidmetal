import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { estimateEtaSeconds, type GeoPoint } from '@xidmetal/shared';

interface DirectionsCacheEntry {
  etaSeconds: number;
  distanceMeters: number;
  expiresAt: number;
}

/**
 * Mapbox Directions (opsional) + haversine fallback.
 * Token yoxdursa yalnız fallback — build/runtime sınmır.
 */
@Injectable()
export class EtaService {
  private readonly logger = new Logger(EtaService.name);
  private readonly cache = new Map<string, DirectionsCacheEntry>();
  private readonly cacheTtlMs = 30_000;

  constructor(private config: ConfigService) {}

  async estimate(from: GeoPoint, to: GeoPoint): Promise<{
    etaSeconds: number;
    distanceMeters: number;
    source: 'mapbox' | 'haversine';
  }> {
    const token = this.config.get<string>('MAPBOX_ACCESS_TOKEN')?.trim();
    if (token) {
      const cached = this.getCached(from, to);
      if (cached) {
        return { ...cached, source: 'mapbox' };
      }
      try {
        const directed = await this.fetchMapboxDirections(token, from, to);
        if (directed) {
          this.setCached(from, to, directed);
          return { ...directed, source: 'mapbox' };
        }
      } catch (error) {
        this.logger.warn(
          `Mapbox Directions uğursuz, haversine: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const fallback = estimateEtaSeconds(from, to);
    return { ...fallback, source: 'haversine' };
  }

  private cacheKey(from: GeoPoint, to: GeoPoint): string {
    const round = (n: number) => n.toFixed(4);
    return `${round(from.lat)},${round(from.lng)}→${round(to.lat)},${round(to.lng)}`;
  }

  private getCached(
    from: GeoPoint,
    to: GeoPoint,
  ): { etaSeconds: number; distanceMeters: number } | null {
    const key = this.cacheKey(from, to);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return { etaSeconds: entry.etaSeconds, distanceMeters: entry.distanceMeters };
  }

  private setCached(
    from: GeoPoint,
    to: GeoPoint,
    value: { etaSeconds: number; distanceMeters: number },
  ): void {
    this.cache.set(this.cacheKey(from, to), {
      ...value,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
  }

  private async fetchMapboxDirections(
    token: string,
    from: GeoPoint,
    to: GeoPoint,
  ): Promise<{ etaSeconds: number; distanceMeters: number } | null> {
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}` +
      `?overview=false&access_token=${encodeURIComponent(token)}`;

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
      return {
        etaSeconds: Math.max(0, Math.round(duration)),
        distanceMeters: Math.max(0, Math.round(distance)),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
