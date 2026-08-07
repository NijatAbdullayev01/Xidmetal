/**
 * HTTP route label-ləri üçün path normalizasiyası.
 * UUID / numeric id → `:id` — Prometheus cardinality partlamasının qarşısını alır.
 */

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
const CUID_LIKE_RE = /\/c[a-z0-9]{20,}/gi;
const NUMERIC_ID_RE = /\/\d+(?=\/|$)/g;

export type HttpRequestLike = {
  baseUrl?: string;
  path?: string;
  url?: string;
  route?: { path?: string | string[] };
  method?: string;
};

/**
 * Nest/Express `req.route.path` + `baseUrl` üstünlük; yoxdursa path-də id əvəzlə.
 */
export function normalizeHttpRoute(req: HttpRequestLike): string {
  const routePath = req.route?.path;
  const pattern =
    typeof routePath === 'string'
      ? routePath
      : Array.isArray(routePath)
        ? routePath[0]
        : undefined;

  if (pattern && pattern.length > 0) {
    const base = (req.baseUrl ?? '').replace(/\/$/, '');
    const joined = `${base}${pattern.startsWith('/') ? pattern : `/${pattern}`}`;
    return joined.replace(/\/{2,}/g, '/') || '/';
  }

  const rawPath = (req.path ?? req.url?.split('?')[0] ?? '/').trim() || '/';
  return redactPathIds(rawPath);
}

export function redactPathIds(path: string): string {
  return path
    .replace(UUID_RE, ':id')
    .replace(CUID_LIKE_RE, '/:id')
    .replace(NUMERIC_ID_RE, '/:id')
    .replace(/\/{2,}/g, '/') || '/';
}

/** Scrape/health özünü ölçməyə qarışdırmamaq üçün */
export function shouldSkipHttpMetric(route: string): boolean {
  const normalized = route.replace(/\/$/, '') || '/';
  return (
    normalized === '/metrics' ||
    normalized.endsWith('/metrics') ||
    normalized === '/health' ||
    normalized.endsWith('/health') ||
    normalized.endsWith('/health/ready')
  );
}
