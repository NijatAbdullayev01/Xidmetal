import type { CookieOptions, Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';

export const ACCESS_COOKIE = 'xidmetal_access';
export const REFRESH_COOKIE = 'xidmetal_refresh';

export function parseDurationMs(duration: string, fallbackMs: number): number {
  const match = duration.match(/^(\d+)([dhms])$/);
  if (!match) return fallbackMs;
  const [, value, unit] = match;
  const num = parseInt(value!, 10);
  const multipliers: Record<string, number> = {
    d: 86400000,
    h: 3600000,
    m: 60000,
    s: 1000,
  };
  return num * (multipliers[unit!] ?? fallbackMs);
}

function baseCookieOptions(config: ConfigService): CookieOptions {
  const isProd = config.get<string>('NODE_ENV') === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  config: ConfigService,
  tokens: { accessToken: string; refreshToken: string },
) {
  const accessMaxAge = parseDurationMs(
    config.get<string>('JWT_EXPIRES_IN', '15m'),
    15 * 60 * 1000,
  );
  const refreshMaxAge = parseDurationMs(
    config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
    30 * 24 * 60 * 60 * 1000,
  );
  const base = baseCookieOptions(config);

  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...base,
    maxAge: accessMaxAge,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base,
    maxAge: refreshMaxAge,
  });
}

export function clearAuthCookies(res: Response, config: ConfigService) {
  const base = baseCookieOptions(config);
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
}

export function readRefreshTokenFromRequest(req: Request, bodyToken?: string): string | undefined {
  const fromCookie = req.cookies?.[REFRESH_COOKIE];
  if (typeof fromCookie === 'string' && fromCookie.length > 0) {
    return fromCookie;
  }
  if (typeof bodyToken === 'string' && bodyToken.length > 0) {
    return bodyToken;
  }
  return undefined;
}
