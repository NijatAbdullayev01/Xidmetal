import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getOrLoadJwtUser,
  invalidateJwtUserCache,
  resetJwtUserCache,
  type JwtAuthUser,
} from './jwt-user-cache';

function user(id: string): JwtAuthUser {
  return {
    id,
    email: `${id}@test.local`,
    firstName: 'A',
    lastName: 'B',
    role: 'CUSTOMER',
    isActive: true,
    isVerified: true,
    deletedAt: null,
    passwordChangedAt: null,
    sessionsRevokedAt: null,
  };
}

describe('getOrLoadJwtUser', () => {
  afterEach(() => {
    resetJwtUserCache();
  });

  it('paralel yükləmələri bir load-a birləşdirir', async () => {
    const load = vi.fn(async () => user('u1'));

    const [a, b, c] = await Promise.all([
      getOrLoadJwtUser('u1', load),
      getOrLoadJwtUser('u1', load),
      getOrLoadJwtUser('u1', load),
    ]);

    expect(load).toHaveBeenCalledTimes(1);
    expect(a?.id).toBe('u1');
    expect(b?.id).toBe('u1');
    expect(c?.id).toBe('u1');
  });

  it('TTL ərzində DB-yə getmir', async () => {
    const load = vi.fn(async () => user('u1'));
    await getOrLoadJwtUser('u1', load);
    await getOrLoadJwtUser('u1', load);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('invalidate-dən sonra yenidən yükləyir', async () => {
    const load = vi.fn(async () => user('u1'));
    await getOrLoadJwtUser('u1', load);
    invalidateJwtUserCache('u1');
    await getOrLoadJwtUser('u1', load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('null nəticəni keşləmir', async () => {
    const load = vi.fn(async () => null);
    await getOrLoadJwtUser('missing', load);
    await getOrLoadJwtUser('missing', load);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
