import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { PrismaService } from '../../common/database/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

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
  @ApiOperation({ summary: 'Readiness — DB əlçatandır' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'up',
        timestamp: new Date().toISOString(),
        service: 'xidmetal-api',
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
        timestamp: new Date().toISOString(),
        service: 'xidmetal-api',
      });
    }
  }
}
