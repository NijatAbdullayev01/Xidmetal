import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto, ServiceQueryDto } from './dto';
import { Public, Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard, OptionalJwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@xidmetal/shared';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Xidmətlər siyahısı' })
  findAll(@Query() query: ServiceQueryDto) {
    return this.servicesService.findAll(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Get('mine')
  @ApiOperation({ summary: 'Provider-in öz xidmətləri' })
  findMine(@CurrentUser('id') userId: string, @Query() query: ServiceQueryDto) {
    return this.servicesService.findMine(userId, query);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Xidmət detalları' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string | undefined,
    @CurrentUser('role') role: string | undefined,
  ) {
    return this.servicesService.findById(id, userId, role);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Post()
  @ApiOperation({ summary: 'Yeni xidmət yarat (Provider)' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateServiceDto) {
    return this.servicesService.create(userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Xidməti yenilə' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, userId, role, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Xidməti sil' })
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.servicesService.remove(id, userId, role);
  }
}
