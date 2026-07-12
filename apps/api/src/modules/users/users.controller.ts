import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { ChangePasswordDto, UpdateProfileDto, RequestEmailChangeDto, ConfirmEmailChangeDto } from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Cari istifadəçi profili' })
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
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
  @ApiOperation({ summary: 'Yeni e-mail üçün təsdiq kodu göndər' })
  requestEmailChange(
    @CurrentUser('id') userId: string,
    @Body() dto: RequestEmailChangeDto,
  ) {
    return this.usersService.requestEmailChange(userId, dto);
  }

  @Post('me/email/confirm-change')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Təsdiq kodu ilə e-maili dəyiş' })
  confirmEmailChange(
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmEmailChangeDto,
  ) {
    return this.usersService.confirmEmailChange(userId, dto);
  }
}
