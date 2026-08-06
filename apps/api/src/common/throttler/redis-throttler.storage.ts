import { Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type Redis from 'ioredis';

/**
 * Redis-backed throttler — multi-instance rate limit.
 * Redis xətası: fail-open (xidmət dayanmasın).
 */
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);

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
        `Redis throttler fail-open: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        totalHits: 0,
        timeToExpire: 0,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }
}
