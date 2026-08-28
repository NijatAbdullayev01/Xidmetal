const DEFAULT_OSRM_BASE = 'https://router.project-osrm.org';
const DEFAULT_ALLOWED_HOSTS = 'router.project-osrm.org';

/**
 * OSRM base URL — yalnız http(s) + host allowlist.
 * Yanlış/qadağan host → null (haversine fallback); SSRF üçün env misconfig qorunması.
 */
export function resolveOsrmBaseUrl(params: {
  configured?: string | null;
  allowedHosts?: string | null;
}): string | null {
  const raw = (params.configured?.trim() || DEFAULT_OSRM_BASE).replace(/\/$/, '');
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return null;
  }

  const allowed = (params.allowedHosts?.trim() || DEFAULT_ALLOWED_HOSTS)
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  if (!allowed.includes(parsed.hostname.toLowerCase())) {
    return null;
  }

  return raw;
}
