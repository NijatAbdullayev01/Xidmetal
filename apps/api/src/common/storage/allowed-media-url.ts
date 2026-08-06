/**
 * Yalnız öz storage host-larımızdan media URL qəbul et.
 * Relative `/uploads/...` və allowlist origin/path prefix.
 */

export function collectMediaBaseUrls(env: {
  storagePublicBaseUrl?: string;
  apiUrl?: string;
  s3PublicUrl?: string;
}): string[] {
  const bases: string[] = [];
  const push = (raw?: string) => {
    const trimmed = raw?.trim();
    if (!trimmed) return;
    bases.push(trimmed.replace(/\/$/, ''));
  };

  push(env.storagePublicBaseUrl);
  push(env.s3PublicUrl);
  if (env.apiUrl?.trim()) {
    push(`${env.apiUrl.replace(/\/$/, '')}/uploads`);
  }

  return [...new Set(bases)];
}

export function isAllowedMediaUrl(url: string, allowedBases: string[]): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith('/uploads/')) {
    return trimmed.length > '/uploads/'.length && !trimmed.includes('..');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  if (parsed.username || parsed.password) {
    return false;
  }

  return allowedBases.some((base) => {
    let baseUrl: URL;
    try {
      baseUrl = new URL(base.endsWith('/') ? base : `${base}/`);
    } catch {
      return false;
    }
    if (parsed.origin !== baseUrl.origin) return false;
    return parsed.pathname.startsWith(baseUrl.pathname);
  });
}
