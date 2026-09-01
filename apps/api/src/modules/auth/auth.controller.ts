import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  LogoutDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RequestEmailVerificationDto,
  ConfirmEmailVerificationDto,
} from './dto';
import { Public, CurrentUser } from '../../common/decorators';
import {
  clearAuthCookies,
  readRefreshTokenFromRequest,
  setAuthCookies,
} from '../../common/auth/auth-cookies';
import {
  CLIENT_APP,
  CLIENT_APP_HEADER,
  type AuthResponse,
  type ClientApp,
} from '@xidmetal/shared';

function resolveClientApp(req: Request, bodyClientApp?: string): ClientApp {
  if (
    bodyClientApp === CLIENT_APP.MARKETPLACE ||
    bodyClientApp === CLIENT_APP.PROVIDER ||
    bodyClientApp === CLIENT_APP.ADMIN
  ) {
    return bodyClientApp;
  }
  const header = req.headers[CLIENT_APP_HEADER];
  const raw = Array.isArray(header) ? header[0] : header;
  if (
    raw === CLIENT_APP.MARKETPLACE ||
    raw === CLIENT_APP.PROVIDER ||
    raw === CLIENT_APP.ADMIN
  ) {
    return raw;
  }
  throw new BadRequestException(
    'Klient audinesi tələb olunur (x-xidmetal-client və ya clientApp)',
  );
}

/** Token-lər yalnız httpOnly cookie — JSON XSS səthi yox */
function toAuthResponse(result: {
  user: AuthResponse['user'] | (Omit<AuthResponse['user'], 'role'> & { role: string });
  tokens: { accessToken: string; refreshToken: string };
  mailDelivered?: boolean;
  previewCode?: string;
}): AuthResponse {
  return {
    user: result.user as AuthResponse['user'],
    ...(result.mailDelivered !== undefined
      ? { mailDelivered: result.mailDelivered }
      : {}),
    ...(result.previewCode ? { previewCode: result.previewCode } : {}),
  };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Yeni istifadəçi qeydiyyatı' })
  async register(
    @Req() req: Request,
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientApp = resolveClientApp(req, dto.clientApp);
    const result = await this.authService.register(dto, clientApp);
    setAuthCookies(res, this.config, result.tokens, clientApp);
    return toAuthResponse(result);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sistemə daxil ol' })
  async login(
    @Req() req: Request,
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientApp = resolveClientApp(req, dto.clientApp);
    try {
      const result = await this.authService.login(dto, clientApp);
      setAuthCookies(res, this.config, result.tokens, clientApp);
      return toAuthResponse(result);
    } catch (error) {
      // Audience uyğunsuzluğu: köhnə/yanlış session cookie-ni sil
      if (error instanceof ForbiddenException) {
        clearAuthCookies(res, this.config, clientApp);
      }
      throw error;
    }
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access token yenilə (cookie və ya body)' })
  async refresh(
    @Req() req: Request,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientAppHint = (() => {
      try {
        return resolveClientApp(req, undefined);
      } catch {
        return undefined;
      }
    })();
    const refreshToken = readRefreshTokenFromRequest(
      req,
      dto.refreshToken,
      clientAppHint,
    );
    if (!refreshToken) {
      throw new BadRequestException('Refresh token tələb olunur');
    }
    try {
      const result = await this.authService.refresh(refreshToken, clientAppHint);
      setAuthCookies(res, this.config, result.tokens, result.clientApp);
      return toAuthResponse(result);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        clearAuthCookies(res, this.config, clientAppHint);
      }
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cari sessiyanı ləğv et (cookie + body)' })
  async logout(
    @Req() req: Request,
    @Body() dto: LogoutDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientAppHint = (() => {
      try {
        return resolveClientApp(req, undefined);
      } catch {
        return undefined;
      }
    })();
    const refreshToken = readRefreshTokenFromRequest(
      req,
      dto.refreshToken,
      clientAppHint,
    );
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    clearAuthCookies(res, this.config, clientAppHint);
    return { message: 'Çıxış edildi' };
  }

  @ApiBearerAuth()
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bütün cihazlardan çıxış' })
  async logoutAll(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logoutAll(userId);
    clearAuthCookies(res, this.config);
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Şifrə bərpası kodu göndər' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email, dto.captchaToken);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kod ilə yeni şifrə təyin et' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify-email/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'E-poçt təsdiq kodunu (yenidən) göndər' })
  requestEmailVerification(@Body() dto: RequestEmailVerificationDto) {
    return this.authService.requestEmailVerification(dto.email, dto.captchaToken);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('verify-email/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'E-poçt təsdiq kodunu təsdiqlə' })
  confirmEmailVerification(@Body() dto: ConfirmEmailVerificationDto) {
    return this.authService.confirmEmailVerification(dto);
  }
}
