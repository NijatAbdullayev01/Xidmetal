const PRODUCTION_SITE_URL = 'https://xidmetal.com';

function isLocalHostname(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return true;
  }
}

/** Test və getSiteUrl üçün — production-da localhost canonical olmasın. */
export function resolveSiteUrl(
  raw: string | undefined,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string {
  const cleaned = raw?.trim().replace(/\/$/, '') || '';
  if (nodeEnv === 'production' && (!cleaned || isLocalHostname(cleaned))) {
    return PRODUCTION_SITE_URL;
  }
  return cleaned || 'http://localhost:3120';
}

/** Public marketplace origin — canonical, Open Graph və sitemap üçün. */
export function getSiteUrl(): string {
  return resolveSiteUrl(process.env.NEXT_PUBLIC_APP_URL);
}

/** Sitemap/SSR üçün daxili API — public host-a loopback etməsin. */
export function getServerApiBaseUrl(): string {
  const internal =
    process.env.INTERNAL_API_URL?.trim() ||
    process.env.API_URL_INTERNAL?.trim() ||
    process.env.API_URL?.trim();
  if (internal) return internal.replace(/\/$/, '');

  const fromPublic = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromPublic) return fromPublic.replace(/\/$/, '');

  return 'http://localhost:4100';
}
