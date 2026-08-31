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
  DeleteAccountDto,
  SubmitKycDocumentDto,
  RequestPhoneChangeDto,
} from './dto';
import { JwtAuthGuard, RolesGuard, EmailVerifiedGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles, RequireEmailVerified } from '../../common/decorators';
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
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.usersService.changePassword(userId, dto);
    clearAuthCookies(res, this.config);
    return result;
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
  async confirmEmailChange(
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmEmailChangeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.usersService.confirmEmailChange(userId, dto);
    clearAuthCookies(res, this.config);
    return result;
  }

  @Patch('me/phone')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Telefon nömrəsini dəyiş' })
  changePhone(
    @CurrentUser('id') userId: string,
    @Body() dto: RequestPhoneChangeDto,
  ) {
    return this.usersService.changePhone(userId, dto);
  }

  @Get('me/kyc')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'KYC sənədlərim' })
  listKyc(@CurrentUser('id') userId: string) {
    return this.usersService.listMyKyc(userId);
  }

  @Post('me/kyc')
  @UseGuards(RolesGuard, EmailVerifiedGuard)
  @Roles(UserRole.PROVIDER)
  @RequireEmailVerified()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'KYC sənədi yüklə' })
  submitKyc(@CurrentUser('id') userId: string, @Body() dto: SubmitKycDocumentDto) {
    return this.usersService.submitKycDocument(userId, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Hesabı soft-delete et (şifrə + Sil təsdiqi)' })
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
