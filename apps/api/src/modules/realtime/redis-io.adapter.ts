import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { ServerOptions } from 'socket.io';
import Redis from 'ioredis';
import type { INestApplication } from '@nestjs/common';

/**
 * Socket.IO Redis adapter — REDIS_URL varsa multi-instance yayım.
 * Yoxdursa / qoşula bilməzsə in-memory (dev fallback); prod-da warn.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(
    app: INestApplication,
    private readonly config: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const redisUrl = this.config.get<string>('REDIS_URL')?.trim();
    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');

    if (!redisUrl) {
      const msg = 'REDIS_URL yoxdur — Socket.IO in-memory adapter (tək node)';
      if (nodeEnv === 'production') {
        this.logger.warn(msg);
      } else {
        this.logger.log(msg);
      }
      return;
    }

    try {
      const pubClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        lazyConnect: false,
      });
      const subClient = pubClient.duplicate();

      pubClient.on('error', (err) => {
        this.logger.warn(`Redis (socket pub): ${err.message}`);
      });
      subClient.on('error', (err) => {
        this.logger.warn(`Redis (socket sub): ${err.message}`);
      });

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log('Socket.IO Redis adapter aktiv');
    } catch (error) {
      this.logger.warn(
        `Socket.IO Redis adapter qoşulmadı, in-memory: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      this.adapterConstructor = null;
    }
  }

  override createIOServer(port: number, options?: Partial<ServerOptions>) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
