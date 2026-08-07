import { Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type Redis from 'ioredis';

type HitBucket = {
  hits: number;
  expiresAt: number;
};

/**
 * Redis-backed throttler — multi-instance rate limit.
 * Redis xətası: in-memory fallback (fail-open deyil — limit saxlanılır; tək instansda).
 */
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly memory = new Map<string, HitBucket>();

  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<{
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
  }> {
    const redisKey = `xidmetal:throttle:${throttlerName}:${key}`;
    try {
      const hits = await this.redis.incr(redisKey);
      if (hits === 1) {
        await this.redis.pexpire(redisKey, ttl);
      }
      const ttlMs = await this.redis.pttl(redisKey);
      const isBlocked = hits > limit;
      return {
        totalHits: hits,
        timeToExpire: Math.max(1, Math.ceil(ttlMs / 1000)),
        isBlocked,
        timeToBlockExpire: isBlocked ? Math.ceil(blockDuration / 1000) : 0,
      };
    } catch (error) {
      this.logger.warn(
        `Redis throttler memory-fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.incrementMemory(redisKey, ttl, limit, blockDuration);
    }
  }

  /** Test və Redis düşməsi üçün — proses daxili sayğac */
  incrementMemory(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): {
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
  } {
    const now = Date.now();
    this.pruneExpired(now);

    const existing = this.memory.get(key);
    if (!existing || existing.expiresAt <= now) {
      this.memory.set(key, { hits: 1, expiresAt: now + ttl });
      return {
        totalHits: 1,
        timeToExpire: Math.max(1, Math.ceil(ttl / 1000)),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }

    existing.hits += 1;
    const isBlocked = existing.hits > limit;
    const timeToExpire = Math.max(1, Math.ceil((existing.expiresAt - now) / 1000));
    return {
      totalHits: existing.hits,
      timeToExpire,
      isBlocked,
      timeToBlockExpire: isBlocked ? Math.ceil(blockDuration / 1000) : 0,
    };
  }

  private pruneExpired(now: number) {
    for (const [key, bucket] of this.memory) {
      if (bucket.expiresAt <= now) {
        this.memory.delete(key);
      }
    }
  }
}
