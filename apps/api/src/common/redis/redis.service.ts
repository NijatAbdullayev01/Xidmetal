import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Paylaşılan Redis klient — throttle, presence, cache.
 * REDIS_URL yoxdursa null: caller-lər in-memory fallback istifadə edir.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.config.get<string>('REDIS_URL')?.trim();
    if (!redisUrl) {
      this.logger.warn('REDIS_URL yoxdur — RedisService deaktiv (in-memory fallback)');
      return;
    }

    try {
      const redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        lazyConnect: false,
      });
      redis.on('error', (err) => {
        this.logger.warn(`Redis: ${err.message}`);
      });
      this.client = redis;
      this.logger.log('RedisService aktiv');
    } catch (error) {
      this.logger.warn(
        `RedisService qoşulmadı: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.client = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
    this.client = null;
  }

  get isAvailable(): boolean {
    return this.client != null && this.client.status === 'ready';
  }

  /**
   * SET key value PX ms NX — true əgər açar yeni yazıldı (throttle/sample gate).
   * Redis yoxdursa null (caller memory fallback).
   */
  async setNxPx(key: string, value: string, ttlMs: number): Promise<boolean | null> {
    if (!this.client) return null;
    try {
      const result = await this.client.set(key, value, 'PX', ttlMs, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.debug(
        `setNxPx fail: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async setPx(key: string, value: string, ttlMs: number): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.set(key, value, 'PX', ttlMs);
      return true;
    } catch {
      return false;
    }
  }

  async incr(key: string): Promise<number | null> {
    if (!this.client) return null;
    try {
      return await this.client.incr(key);
    } catch {
      return null;
    }
  }

  async decr(key: string): Promise<number | null> {
    if (!this.client) return null;
    try {
      return await this.client.decr(key);
    } catch {
      return null;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.expire(key, seconds);
    } catch {
      /* ignore */
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch {
      /* ignore */
    }
  }
}
