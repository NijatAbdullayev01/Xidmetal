/** PAYMENTS_ENABLED parse — saf helper (unit test + service) */
export const PAYMENTS_DISABLED_MESSAGE = 'Ödəniş hələ aktiv deyil';

export function isPaymentsEnabled(raw: string | undefined | null): boolean {
  return raw?.trim().toLowerCase() === 'true';
}
