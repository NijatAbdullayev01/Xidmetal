/**
 * Device token validation — saf helper.
 */
export function isValidDeviceTokenShape(token: string): boolean {
  const t = token.trim();
  if (t.length < 32 || t.length > 4096) return false;
  // FCM / VAPID tokens: printable ASCII, whitespace yox
  return /^[\x21-\x7E]+$/.test(t);
}

export function maskDeviceToken(token: string): string {
  if (token.length <= 12) return '••••';
  return `${token.slice(0, 6)}…${token.slice(-4)}`;
}
