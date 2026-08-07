import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';
import { JwtAuthGuard } from '../../common/guards';
import { readAccessTokenFromCookies } from '../../common/auth/auth-cookies';
import { readClientAppFromRequest } from '../../common/auth/client-audience';

/**
 * httpOnly cookie-dakı access JWT-ni WS handshake üçün qaytarır.
 * XSS riski cookie ilə eyni səviyyədədir (credentials fetch artıq mümkün).
 * App-scoped cookie — x-xidmetal-client ilə doğru sessiya seçilir.
 */
@ApiTags('Realtime')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('realtime')
export class RealtimeController {
  @Get('socket-token')
  @ApiOperation({
    summary: 'WebSocket handshake üçün access token (cookie/session)',
  })
  socketToken(@Req() req: Request): { token: string } {
    const clientApp = readClientAppFromRequest(req);

    const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (fromHeader) {
      return { token: fromHeader };
    }

    const fromCookie = readAccessTokenFromCookies(req, clientApp);
    if (fromCookie) {
      return { token: fromCookie };
    }

    throw new UnauthorizedException('Access token tapılmadı');
  }
}
