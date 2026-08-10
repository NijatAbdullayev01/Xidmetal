import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import {
  CLIENT_APP,
  CLIENT_APP_HEADER,
  type ClientApp,
} from '@xidmetal/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { readAccessTokenFromCookieHeader } from '../../common/auth/auth-cookies';
import {
  assertSessionAudience,
  normalizeTokenAudience,
} from '../../common/auth/client-audience';
import type { WsAuthenticatedUser } from './realtime-auth';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  aud?: string | string[];
  iat?: number;
}

/**
 * Socket.IO handshake auth — prioritet httpOnly cookie sessiyasıdır.
 * Fallback: auth.token | Authorization Bearer
 */
@Injectable()
export class WsAuthService {
  private readonly logger = new Logger(WsAuthService.name);

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async authenticateSocket(client: Socket): Promise<WsAuthenticatedUser> {
    const headerApp = this.readClientApp(client);
    const token = this.extractToken(client, headerApp);
    if (!token) {
      throw new WsException('Autentifikasiya tələb olunur');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new WsException('Sessiya etibarsızdır. Yenidən daxil olun');
    }

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
      throw new WsException('İstifadəçi tapılmadı');
    }

    if (
      user.passwordChangedAt &&
      typeof payload.iat === 'number' &&
      payload.iat * 1000 < user.passwordChangedAt.getTime()
    ) {
      throw new WsException('Sessiya etibarsızdır. Yenidən daxil olun');
    }

    const tokenAud = normalizeTokenAudience(payload.aud);

    try {
      assertSessionAudience({
        headerApp,
        tokenAud,
        role: user.role,
        mode: 'ws',
      });
    } catch (error) {
      if (error instanceof WsException) {
        this.logger.debug(
          `WS audience rədd: role=${user.role} header=${headerApp ?? '-'} aud=${tokenAud ?? '-'}`,
        );
      }
      throw error;
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

  extractToken(client: Socket, clientApp?: ClientApp): string | null {
    const cookieHeader = client.handshake.headers.cookie;
    if (typeof cookieHeader === 'string' && cookieHeader.length > 0) {
      const cookieToken = readAccessTokenFromCookieHeader(cookieHeader, clientApp);
      if (cookieToken) {
        return cookieToken;
      }
    }

    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      return authToken.trim();
    }

    const authHeader = client.handshake.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const bearer = authHeader.slice('Bearer '.length).trim();
      if (bearer.length > 0) return bearer;
    }

    return null;
  }

  private readClientApp(client: Socket): ClientApp | undefined {
    const fromAuth = client.handshake.auth?.clientApp;
    if (fromAuth === CLIENT_APP.MARKETPLACE || fromAuth === CLIENT_APP.ADMIN) {
      return fromAuth;
    }

    const header = client.handshake.headers[CLIENT_APP_HEADER];
    const raw = Array.isArray(header) ? header[0] : header;
    if (raw === CLIENT_APP.MARKETPLACE || raw === CLIENT_APP.ADMIN) {
      return raw;
    }
    return undefined;
  }
}
