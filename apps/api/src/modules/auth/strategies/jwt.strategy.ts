import { Injectable, UnauthorizedException, Inject, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PrismaService } from '../../../common/database/prisma.service';
import { ACCESS_COOKIE } from '../../../common/auth/auth-cookies';
import { CLIENT_APP, CLIENT_APP_HEADER, type ClientApp } from '@xidmetal/shared';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  aud?: string;
  iat?: number;
}

function extractAccessToken(req: Request): string | null {
  const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (fromHeader) return fromHeader;

  const fromCookie = req.cookies?.[ACCESS_COOKIE];
  return typeof fromCookie === 'string' && fromCookie.length > 0 ? fromCookie : null;
}

function readClientAppHeader(req: Request): ClientApp | undefined {
  const header = req.headers[CLIENT_APP_HEADER];
  const raw = Array.isArray(header) ? header[0] : header;
  if (raw === CLIENT_APP.MARKETPLACE || raw === CLIENT_APP.ADMIN) {
    return raw;
  }
  return undefined;
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

    // Header göndərilibsə JWT aud ilə uyğun olmalıdır (cross-app cookie/token qarşısı)
    const headerApp = readClientAppHeader(req);
    const tokenAud =
      payload.aud === CLIENT_APP.ADMIN || payload.aud === CLIENT_APP.MARKETPLACE
        ? payload.aud
        : undefined;

    if (headerApp && tokenAud && headerApp !== tokenAud) {
      throw new ForbiddenException('Sessiya bu tətbiq üçün etibarsızdır');
    }

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
