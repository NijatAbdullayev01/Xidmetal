/**
 * Public GET Next.js Data Cache / ISR üçün cookie göndərməməlidir —
 * `credentials: 'include'` Server Component-də `cookies()`-i işə salır və
 * səhifəni hər naviqasiyada dinamik (yavaş) edir.
 */
export function isPublicGetRequest(method?: string, token?: string): boolean {
  if (token) return false;
  const normalized = (method ?? 'GET').toUpperCase();
  return normalized === 'GET';
}
