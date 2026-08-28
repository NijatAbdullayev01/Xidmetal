/**
 * Access JWT `iat` (saniyə) vs server cutoff (passwordChangedAt / sessionsRevokedAt).
 * `iat` yoxdursa (qeyri-standart payload) ləğv edilmiş sayılır.
 */
export function isAccessJwtRevoked(
  iat: number | undefined,
  ...cutoffs: Array<Date | null | undefined>
): boolean {
  if (typeof iat !== 'number' || !Number.isFinite(iat)) return true;
  const iatMs = iat * 1000;
  return cutoffs.some((cutoff) => cutoff != null && iatMs < cutoff.getTime());
}
