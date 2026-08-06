import { createHash } from 'crypto';

/** Refresh token DB-də heç vaxt plain text saxlanılmır — yalnız SHA-256 hash. */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
