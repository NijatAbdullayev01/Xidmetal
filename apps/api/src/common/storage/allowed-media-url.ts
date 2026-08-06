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

  // İmza query-si validation-a mane olmasın
  let withoutQuery = trimmed;
  const q = trimmed.indexOf('?');
  if (q !== -1) withoutQuery = trimmed.slice(0, q);
  const hash = withoutQuery.indexOf('#');
  if (hash !== -1) withoutQuery = withoutQuery.slice(0, hash);

  if (withoutQuery.startsWith('/uploads/')) {
    return withoutQuery.length > '/uploads/'.length && !withoutQuery.includes('..');
  }

  let parsed: URL;
  try {
    parsed = new URL(withoutQuery);
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
