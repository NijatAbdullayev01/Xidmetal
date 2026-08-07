import { describe, expect, it, vi } from 'vitest';
import { RedisThrottlerStorage } from './redis-throttler.storage';

describe('RedisThrottlerStorage', () => {
  it('Redis uğurlu olanda sayır və limit keçəndə bloklayır', async () => {
    const redis = {
      incr: vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(3),
      pexpire: vi.fn().mockResolvedValue(1),
      pttl: vi.fn().mockResolvedValue(30_000),
    };
    const storage = new RedisThrottlerStorage(redis as never);

    const first = await storage.increment('ip:1', 60_000, 2, 60_000, 'default');
    expect(first.totalHits).toBe(1);
    expect(first.isBlocked).toBe(false);

    const blocked = await storage.increment('ip:1', 60_000, 2, 60_000, 'default');
    expect(blocked.totalHits).toBe(3);
    expect(blocked.isBlocked).toBe(true);
    expect(blocked.timeToBlockExpire).toBeGreaterThan(0);
  });

  it('Redis xətası → memory fallback limiti saxlayır (fail-open deyil)', async () => {
    const redis = {
      incr: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      pexpire: vi.fn(),
      pttl: vi.fn(),
    };
    const storage = new RedisThrottlerStorage(redis as never);

    const a = await storage.increment('ip:fail', 60_000, 2, 60_000, 'default');
    const b = await storage.increment('ip:fail', 60_000, 2, 60_000, 'default');
    const c = await storage.increment('ip:fail', 60_000, 2, 60_000, 'default');

    expect(a.isBlocked).toBe(false);
    expect(b.isBlocked).toBe(false);
    expect(c.totalHits).toBe(3);
    expect(c.isBlocked).toBe(true);
  });

  it('memory bucket TTL bitəndə sayğac sıfırlanır', () => {
    const storage = new RedisThrottlerStorage({} as never);
    const first = storage.incrementMemory('k', 1, 10, 60_000);
    expect(first.totalHits).toBe(1);

    // expiresAt keçmişə — birbaşa bucket manipulyasiyası əvəzinə qısa ttl ilə gözləmək flaky olar;
    // eyni açarda yeni bucket: expiresAt keçmiş → hits=1
    const bucketMap = (
      storage as unknown as { memory: Map<string, { hits: number; expiresAt: number }> }
    ).memory;
    bucketMap.set('k', { hits: 9, expiresAt: Date.now() - 1 });
    const next = storage.incrementMemory('k', 60_000, 10, 60_000);
    expect(next.totalHits).toBe(1);
    expect(next.isBlocked).toBe(false);
  });
});
