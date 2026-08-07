import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { TrackingService } from './tracking.service';

@ApiTags('Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class TrackingController {
  constructor(private trackingService: TrackingService) {}

  @Get(':id/location-pings')
  @ApiOperation({
    summary: 'Sifariş lokasiya tarixçəsi (iştirakçı; sampling LocationPing)',
  })
  getLocationPings(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit ? Number.parseInt(limit, 10) : 100;
    return this.trackingService.getLocationPings(
      id,
      userId,
      role,
      Number.isFinite(parsed) ? parsed : 100,
    );
  }
}
