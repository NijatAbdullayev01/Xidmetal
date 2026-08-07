import { kmToMeters } from '@xidmetal/shared';

/** ST_DWithin radius (metr) — query builder / test üçün saf funksiya */
export function nearbyRadiusMeters(radiusKm: number): number {
  return kmToMeters(radiusKm);
}

/**
 * PostGIS yaxınlıq SQL fraqmenti (sənədləşdirmə + test).
 * Parametrlər: $1=lng, $2=lat, $3=radiusM (Prisma.raw parametrləri xidmətdə).
 */
export function buildStDWithinPredicate(alias = 'pp'): string {
  return `${alias}.last_location IS NOT NULL AND ST_DWithin(
    ${alias}.last_location,
    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
    $3
  )`;
}

export function buildStDistanceSelect(alias = 'pp'): string {
  return `ST_Distance(
    ${alias}.last_location,
    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
  ) AS distance_m`;
}
