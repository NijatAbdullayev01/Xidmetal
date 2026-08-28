import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@xidmetal/shared';
import { Public, Roles } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import {
  GeocodeQueryDto,
  NearbyProvidersQueryDto,
  OnlineProvidersCountQueryDto,
  ReverseGeocodeQueryDto,
  DrivingRouteQueryDto,
  UpdateProviderAvailabilityDto,
  UpdateProviderLocationDto,
} from './dto';
import { GeoService } from './geo.service';
import { EtaService } from './eta.service';

@ApiTags('Geo')
@Controller('geo')
export class GeoController {
  constructor(
    private geoService: GeoService,
    private etaService: EtaService,
  ) {}

  @Public()
  @Get('geocode')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Ünvanı koordinatlara çevir (geokodlaşdırma)' })
  geocode(@Query() query: GeocodeQueryDto) {
    return this.geoService.geocode(query.q);
  }

  @Public()
  @Get('reverse')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Koordinatları ünvana çevir (reverse geocode)' })
  reverse(@Query() query: ReverseGeocodeQueryDto) {
    return this.geoService.reverseGeocode(query.lat, query.lng);
  }

  @Public()
  @Get('online-count')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Seçilmiş xidmət növü üzrə onlayn xidmət verənlərin sayı (təcili sifariş UI)',
  })
  onlineCount(@Query() query: OnlineProvidersCountQueryDto) {
    return this.geoService.countOnlineProviders(query);
  }

  @Public()
  @Get('nearby')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Yaxın onlayn xidmət verənlər (PostGIS ST_DWithin; fallback haversine)',
  })
  nearby(@Query() query: NearbyProvidersQueryDto) {
    return this.geoService.findNearby(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('route')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Sürücülük marşrutu — yalnız sifariş iştirakçısı, təyinat booking dest-dir',
  })
  async route(
    @CurrentUser() user: { id: string; role: string },
    @Query() query: DrivingRouteQueryDto,
  ) {
    const dest = await this.geoService.assertDrivingRouteDest(
      user.id,
      user.role,
      query.bookingId,
    );
    const estimate = await this.etaService.estimate(
      { lat: query.fromLat, lng: query.fromLng },
      dest,
    );
    return {
      etaSeconds: estimate.etaSeconds,
      distanceMeters: estimate.distanceMeters,
      routePolyline: estimate.routePolyline ?? null,
      source: estimate.source,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Post('me/location')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Xidmət verənin mövqeyini yenilə (lat/lng/heading)' })
  updateLocation(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProviderLocationDto,
  ) {
    return this.geoService.updateMyLocation(userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Patch('me/availability')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Xidmət verənin əlçatanlığını yenilə (ONLINE/OFFLINE/BUSY)' })
  updateAvailability(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProviderAvailabilityDto,
  ) {
    return this.geoService.updateMyAvailability(userId, dto);
  }
}
