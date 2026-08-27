/**
 * Brauzerdə göstərmək üçün upload URL.
 * API `http://localhost:4100/uploads/...` qaytarır; Next.js `/uploads` rewrite
 * eyni origin-dən verir — CSP `img-src 'self'` və lokal HTTP üçün.
 * S3/CDN absolute URL-ləri və imza query-si saxlanır.
 */
export function toDisplayMediaUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  const hashIndex = trimmed.indexOf('#');
  const withoutHash = hashIndex === -1 ? trimmed : trimmed.slice(0, hashIndex);
  const qIndex = withoutHash.indexOf('?');
  const pathPart = qIndex === -1 ? withoutHash : withoutHash.slice(0, qIndex);
  const search = qIndex === -1 ? '' : withoutHash.slice(qIndex);

  let pathname: string;
  if (pathPart.startsWith('/')) {
    pathname = pathPart;
  } else {
    const schemeEnd = pathPart.indexOf('://');
    if (schemeEnd === -1) return trimmed;
    const pathStart = pathPart.indexOf('/', schemeEnd + 3);
    if (pathStart === -1) return trimmed;
    pathname = pathPart.slice(pathStart);
  }

  if (!pathname.startsWith('/uploads/')) {
    return trimmed;
  }
  if (pathname.includes('..') || pathname.includes('\\')) {
    return trimmed;
  }

  return `${pathname}${search}`;
}
