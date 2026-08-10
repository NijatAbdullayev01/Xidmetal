import {
  Controller,
  Get,
  Header,
  Headers,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { timingSafeEqual } from 'crypto';
import type { Response } from 'express';
import { Public } from '../decorators';
import { MetricsService } from './metrics.service';

function safeEqualUtf8(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @SkipThrottle()
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Prometheus metrics (exposition). Production-da METRICS_TOKEN Bearer məcburidir.',
  })
  async scrape(
    @Res({ passthrough: true }) res: Response,
    @Headers('authorization') authorization?: string,
  ): Promise<string> {
    this.assertMetricsAccess(authorization);
    res.setHeader('Content-Type', this.metrics.contentType);
    return this.metrics.getMetricsText();
  }

  private assertMetricsAccess(authorization?: string): void {
    const token = this.config.get<string>('METRICS_TOKEN')?.trim();
    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');

    // Production: token məcburi — scrape üçün Bearer göndərin.
    if (!token) {
      if (nodeEnv === 'production') {
        throw new UnauthorizedException(
          'Metrics üçün METRICS_TOKEN təyin edin',
        );
      }
      return;
    }

    const expected = `Bearer ${token}`;
    if (!authorization || !safeEqualUtf8(authorization, expected)) {
      throw new UnauthorizedException('Metrics üçün etibarlı token tələb olunur');
    }
  }
}
