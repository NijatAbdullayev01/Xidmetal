import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@xidmetal/shared';
import { AnalyticsService } from './analytics.service';
import { AdminAnalyticsQueryDto, AnalyticsBeaconDto } from './dto';
import { Public, Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';

@ApiTags('Analytics')
@Controller()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Public()
  @Post('analytics/beacon')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sayt analitika beacon (page view / click / sessiya)' })
  ingest(
    @Body() dto: AnalyticsBeaconDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.analyticsService.ingestBeacon(dto, userAgent);
  }

  @Get('admin/analytics')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Sayt analitika icmalı (ziyarətçi, sessiya, səhifə, klik)' })
  overview(@Query() query: AdminAnalyticsQueryDto) {
    return this.analyticsService.getOverview(query);
  }
}
