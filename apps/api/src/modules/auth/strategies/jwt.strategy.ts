import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PrismaService } from '../../../common/database/prisma.service';
import { readAccessTokenFromCookies } from '../../../common/auth/auth-cookies';
import {
  assertSessionAudience,
  normalizeTokenAudience,
  readClientAppFromRequest,
} from '../../../common/auth/client-audience';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  aud?: string | string[];
  iat?: number;
}

function extractAccessToken(req: Request): string | null {
  const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (fromHeader) return fromHeader;

  const clientApp = readClientAppFromRequest(req);
  return readAccessTokenFromCookies(req, clientApp);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ConfigService) configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: extractAccessToken,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isVerified: true,
        deletedAt: true,
        passwordChangedAt: true,
      },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('İstifadəçi tapılmadı');
    }

    // Şifrə dəyişəndən əvvəl verilmiş access JWT keçərsizdir
    if (
      user.passwordChangedAt &&
      typeof payload.iat === 'number' &&
      payload.iat * 1000 < user.passwordChangedAt.getTime()
    ) {
      throw new UnauthorizedException('Sessiya etibarsızdır. Yenidən daxil olun');
    }

    const headerApp = readClientAppFromRequest(req);
    const tokenAud = normalizeTokenAudience(payload.aud);
    assertSessionAudience({
      headerApp,
      tokenAud,
      role: user.role,
      mode: 'http',
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      isVerified: user.isVerified,
      aud: tokenAud,
    };
  }
}
