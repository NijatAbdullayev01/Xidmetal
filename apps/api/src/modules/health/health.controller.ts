import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import Redis from 'ioredis';
import { Public } from '../../common/decorators';
import { PrismaService } from '../../common/database/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness — proses canlıdır' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'xidmetal-api',
    };
  }

  @Public()
  @Get('ready')
  @ApiOperation({
    summary: 'Readiness — DB (+ REDIS_URL varsa Redis) əlçatandır',
  })
  async ready() {
    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');
    const redisUrl = this.config.get<string>('REDIS_URL')?.trim();
    const timestamp = new Date().toISOString();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
        redis: redisUrl ? 'unchecked' : nodeEnv === 'production' ? 'missing' : 'not_configured',
        timestamp,
        service: 'xidmetal-api',
      });
    }

    if (redisUrl) {
      const redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2_000,
        lazyConnect: true,
        enableOfflineQueue: false,
      });
      try {
        await redis.connect();
        const pong = await redis.ping();
        if (pong !== 'PONG') {
          throw new Error('unexpected ping');
        }
      } catch {
        throw new ServiceUnavailableException({
          status: 'error',
          database: 'up',
          redis: 'down',
          timestamp: new Date().toISOString(),
          service: 'xidmetal-api',
        });
      } finally {
        try {
          redis.disconnect();
        } catch {
          /* ignore */
        }
      }

      return {
        status: 'ok',
        database: 'up',
        redis: 'up',
        timestamp: new Date().toISOString(),
        service: 'xidmetal-api',
      };
    }

    // Production-da Redis WS/dispatch/throttle üçün lazımdır — ready fail.
    if (nodeEnv === 'production') {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'up',
        redis: 'missing',
        timestamp: new Date().toISOString(),
        service: 'xidmetal-api',
      });
    }

    return {
      status: 'ok',
      database: 'up',
      redis: 'not_configured',
      timestamp: new Date().toISOString(),
      service: 'xidmetal-api',
    };
  }
}
