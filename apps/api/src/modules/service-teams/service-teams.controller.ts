import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@xidmetal/shared';
import { RequireEmailVerified, Roles } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EmailVerifiedGuard, JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CreateServiceTeamDto, UpdateServiceTeamDto } from './dto';
import { ServiceTeamsService } from './service-teams.service';

@ApiTags('Service teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PROVIDER)
@Controller('services/:serviceId/teams')
export class ServiceTeamsController {
  constructor(private serviceTeamsService: ServiceTeamsService) {}

  @Get()
  @ApiOperation({ summary: 'Xidmətin komandaları' })
  list(@Param('serviceId') serviceId: string, @CurrentUser('id') userId: string) {
    return this.serviceTeamsService.list(serviceId, userId);
  }

  @Post()
  @UseGuards(EmailVerifiedGuard)
  @RequireEmailVerified()
  @ApiOperation({ summary: 'Xidmətə yeni komanda əlavə et (yalnız şirkət)' })
  create(
    @Param('serviceId') serviceId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateServiceTeamDto,
  ) {
    return this.serviceTeamsService.create(serviceId, userId, dto);
  }

  @Patch(':teamId')
  @UseGuards(EmailVerifiedGuard)
  @RequireEmailVerified()
  @ApiOperation({ summary: 'Komandanı yenilə (yalnız şirkət)' })
  update(
    @Param('serviceId') serviceId: string,
    @Param('teamId') teamId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateServiceTeamDto,
  ) {
    return this.serviceTeamsService.update(serviceId, teamId, userId, dto);
  }

  @Delete(':teamId')
  @HttpCode(204)
  @UseGuards(EmailVerifiedGuard)
  @RequireEmailVerified()
  @ApiOperation({ summary: 'Komandanı sil (yalnız şirkət)' })
  async remove(
    @Param('serviceId') serviceId: string,
    @Param('teamId') teamId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.serviceTeamsService.remove(serviceId, teamId, userId);
  }
}
