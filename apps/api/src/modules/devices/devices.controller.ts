import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards';
import { RegisterDeviceTokenDto, UnregisterDeviceTokenDto } from './dto';
import { DevicesService } from './devices.service';

@ApiTags('Devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private devicesService: DevicesService) {}

  @Get('tokens')
  @ApiOperation({ summary: 'Qeydiyyatlı cihaz tokenləri' })
  list(@CurrentUser('id') userId: string) {
    return this.devicesService.listMine(userId);
  }

  @Post('tokens')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Push cihaz tokeni qeydiyyat et' })
  register(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    return this.devicesService.register(userId, dto);
  }

  @Delete('tokens')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Push cihaz tokenini sil' })
  unregister(
    @CurrentUser('id') userId: string,
    @Body() dto: UnregisterDeviceTokenDto,
  ) {
    return this.devicesService.unregister(userId, dto);
  }
}
