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
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return null;

  // Path-də `//` (protocol-relative) və ya `\` qalıqları olmamalıdır
  const pathOnly = trimmed.split(/[?#]/, 1)[0] ?? trimmed;
  if (pathOnly.includes('//') || pathOnly.includes('\\')) return null;

  return trimmed;
}
