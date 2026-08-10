import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import {
  UpsertWorkingHoursDto,
  CreateAvailabilityOverrideDto,
  AvailabilityQueryDto,
} from './dto';
import { Public, Roles, RequireEmailVerified } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard, RolesGuard, EmailVerifiedGuard } from '../../common/guards';
import { UserRole } from '@xidmetal/shared';

@ApiTags('Availability')
@Controller('services')
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) {}

  @Public()
  @Get(':serviceId/availability')
  @ApiOperation({ summary: 'Xidmət üçün boş/dolu slotlar (public)' })
  getAvailability(@Param('serviceId') serviceId: string, @Query() query: AvailabilityQueryDto) {
    return this.availabilityService.resolvePublicSlots(serviceId, query.from, query.to);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Get(':serviceId/working-hours')
  @ApiOperation({ summary: 'Həftəlik iş saatları' })
  getWorkingHours(
    @Param('serviceId') serviceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.availabilityService.getWorkingHours(serviceId, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, EmailVerifiedGuard)
  @Roles(UserRole.PROVIDER)
  @RequireEmailVerified()
  @Put(':serviceId/working-hours')
  @ApiOperation({ summary: 'Həftəlik iş saatlarını yenilə' })
  upsertWorkingHours(
    @Param('serviceId') serviceId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpsertWorkingHoursDto,
  ) {
    return this.availabilityService.upsertWorkingHours(serviceId, userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Get(':serviceId/availability/overrides')
  @ApiOperation({ summary: 'Boş/bağlı override-lər' })
  getOverrides(
    @Param('serviceId') serviceId: string,
    @CurrentUser('id') userId: string,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.availabilityService.getOverrides(serviceId, userId, query.from, query.to);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, EmailVerifiedGuard)
  @Roles(UserRole.PROVIDER)
  @RequireEmailVerified()
  @Post(':serviceId/availability/overrides')
  @ApiOperation({ summary: 'Boş və ya bağlı gün/saat əlavə et' })
  createOverride(
    @Param('serviceId') serviceId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAvailabilityOverrideDto,
  ) {
    return this.availabilityService.createOverride(serviceId, userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, EmailVerifiedGuard)
  @Roles(UserRole.PROVIDER)
  @RequireEmailVerified()
  @Delete(':serviceId/availability/overrides/:overrideId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Override sil' })
  async deleteOverride(
    @Param('serviceId') serviceId: string,
    @Param('overrideId') overrideId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.availabilityService.deleteOverride(serviceId, overrideId, userId);
  }
}
