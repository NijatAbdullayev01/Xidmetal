/**
 * Cloudflare Turnstile dummy/test açarları.
 * @see https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 * Production-da «For testing only. If seen, report to site owner» banner-i çıxarır
 * və siteverify həmişə keçir — real bot qorunması yoxdur.
 */
export const TURNSTILE_DUMMY_SITE_KEYS = new Set([
  '1x00000000000000000000AA',
  '1x00000000000000000000BB',
  '2x00000000000000000000AB',
  '3x00000000000000000000FF',
]);

export const TURNSTILE_DUMMY_SECRETS = new Set([
  '1x0000000000000000000000000000000AA',
  '2x0000000000000000000000000000000AA',
  '3x0000000000000000000000000000000AA',
]);

export function isTurnstileDummySiteKey(
  value: string | null | undefined,
): boolean {
  const v = value?.trim();
  return Boolean(v) && TURNSTILE_DUMMY_SITE_KEYS.has(v as string);
}

export function isTurnstileDummySecret(
  value: string | null | undefined,
): boolean {
  const v = value?.trim();
  return Boolean(v) && TURNSTILE_DUMMY_SECRETS.has(v as string);
}

/** Dummy və ya boş sitekey → widget yox (dev skip ilə eyni). */
export function resolveTurnstileSiteKey(
  value: string | null | undefined,
): string {
  const v = value?.trim() ?? '';
  if (!v || isTurnstileDummySiteKey(v)) return '';
  return v;
}

/**
 * Yalnız eyni-origin relative path — open redirect qorunması.
 * `/\evil.com` (backslash → `/`) və encoded `\`, host hijack bloklanır.
 */
export function sanitizeInternalPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  if (trimmed.includes('\\') || /%5c/i.test(trimmed)) return null;
  if (trimmed.includes('://')) return null;
  // C0/DEL — açıq nəzarət simvolları (no-control-regex istisnası)
  // eslint-disable-next-line no-control-regex -- \u0000-\u001f, \u007f
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return null;

  // Path-də `//` (protocol-relative) və ya `\` qalıqları olmamalıdır
  const pathOnly = trimmed.split(/[?#]/, 1)[0] ?? trimmed;
  if (pathOnly.includes('//') || pathOnly.includes('\\')) return null;

  return trimmed;
}
