/**
 * JWT validate hər HTTP/WS sorğusunda User cədvəlinə gedir.
 * Kabinet səhifəsi 4–8 paralel sorğu atır — eyni user üçün bir DB oxusu kifayətdir.
 * Qısa TTL + in-flight dedupe; şifrə/deaktivasiyada invalidate edilməlidir.
 */
export const JWT_AUTH_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  isVerified: true,
  deletedAt: true,
  passwordChangedAt: true,
} as const;

export type JwtAuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  deletedAt: Date | null;
  passwordChangedAt: Date | null;
};

export const JWT_USER_CACHE_TTL_MS = 5_000;

type CacheEntry = {
  value: JwtAuthUser;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<JwtAuthUser | null>>();

export function invalidateJwtUserCache(userId?: string): void {
  if (userId) {
    cache.delete(userId);
    return;
  }
  cache.clear();
}

/** Test üçün */
export function resetJwtUserCache(): void {
  cache.clear();
  inflight.clear();
}

export async function getOrLoadJwtUser(
  userId: string,
  load: () => Promise<JwtAuthUser | null>,
  now = Date.now(),
): Promise<JwtAuthUser | null> {
  const hit = cache.get(userId);
  if (hit && hit.expiresAt > now) {
    return hit.value;
  }

  const pending = inflight.get(userId);
  if (pending) return pending;

  const promise = load()
    .then((value) => {
      if (value) {
        cache.set(userId, {
          value,
          expiresAt: Date.now() + JWT_USER_CACHE_TTL_MS,
        });
      }
      return value;
    })
    .finally(() => {
      inflight.delete(userId);
    });

  inflight.set(userId, promise);
  return promise;
}
