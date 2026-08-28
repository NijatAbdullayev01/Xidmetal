import { kmToMeters } from '@xidmetal/shared';

/** ST_DWithin radius (metr) — query builder / test üçün saf funksiya */
export function nearbyRadiusMeters(radiusKm: number): number {
  return kmToMeters(radiusKm);
}

/** Public nearby: ~110m grid — dəqiq GPS izləməsinin qarşısı */
const PUBLIC_COORD_DECIMALS = 3;
/** Public məsafə — yuxarıya yuvarla (minimum 50 m) */
const PUBLIC_DISTANCE_QUANTUM_M = 50;

export function coarsenPublicCoordinate(value: number): number {
  const factor = 10 ** PUBLIC_COORD_DECIMALS;
  return Math.round(value * factor) / factor;
}

export function coarsenPublicDistanceM(distanceM: number): number {
  const quantized =
    Math.ceil(distanceM / PUBLIC_DISTANCE_QUANTUM_M) * PUBLIC_DISTANCE_QUANTUM_M;
  return Math.max(PUBLIC_DISTANCE_QUANTUM_M, quantized);
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
