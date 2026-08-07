import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@xidmetal/shared';
import type { Response } from 'express';
import { UsersService } from './users.service';
import {
  ChangePasswordDto,
  UpdateProfileDto,
  RequestEmailChangeDto,
  ConfirmEmailChangeDto,
  ConfirmPhoneVerifyDto,
  DeleteAccountDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators';
import { clearAuthCookies } from '../../common/auth/auth-cookies';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private config: ConfigService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Cari istifadəçi profili' })
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Get('me/dashboard-stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'Xidmət verən kabinet statistikası' })
  getDashboardStats(@CurrentUser('id') userId: string) {
    return this.usersService.getProviderDashboardStats(userId);
  }

  @Post('me/heartbeat')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Onlayn statusu yenilə (presence heartbeat)' })
  heartbeat(@CurrentUser('id') userId: string) {
    return this.usersService.heartbeat(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Profil məlumatlarını yenilə' })
  updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Şifrəni dəyiş' })
  changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(userId, dto);
  }

  @Post('me/email/request-change')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Yeni e-poçt üçün təsdiq kodu göndər' })
  requestEmailChange(
    @CurrentUser('id') userId: string,
    @Body() dto: RequestEmailChangeDto,
  ) {
    return this.usersService.requestEmailChange(userId, dto);
  }

  @Post('me/email/confirm-change')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Təsdiq kodu ilə e-poçtu dəyiş' })
  confirmEmailChange(
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmEmailChangeDto,
  ) {
    return this.usersService.confirmEmailChange(userId, dto);
  }

  @Post('me/phone/request-verify')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Mobil nömrə üçün SMS təsdiq kodu göndər' })
  requestPhoneVerify(@CurrentUser('id') userId: string) {
    return this.usersService.requestPhoneVerify(userId);
  }

  @Post('me/phone/confirm-verify')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'SMS kodu ilə telefonu təsdiqlə' })
  confirmPhoneVerify(
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmPhoneVerifyDto,
  ) {
    return this.usersService.confirmPhoneVerify(userId, dto);
  }

  @Get('me/export')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Şəxsi məlumatların JSON ixracı (GDPR)' })
  exportMe(@CurrentUser('id') userId: string) {
    return this.usersService.exportMyData(userId);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Hesabı soft-delete et (şifrə + SIL təsdiqi)' })
  async deleteMe(
    @CurrentUser('id') userId: string,
    @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.usersService.deleteAccount(userId, dto);
    clearAuthCookies(res, this.config);
    return result;
  }
}
