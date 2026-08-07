import type { CookieOptions, Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { CLIENT_APP, type ClientApp } from '@xidmetal/shared';

/** Legacy (pre-namespace) — oxuma fallback; yazıda təmizlənir */
export const ACCESS_COOKIE = 'xidmetal_access';
export const REFRESH_COOKIE = 'xidmetal_refresh';

export const ACCESS_COOKIE_MARKETPLACE = 'xidmetal_access_marketplace';
export const REFRESH_COOKIE_MARKETPLACE = 'xidmetal_refresh_marketplace';
export const ACCESS_COOKIE_ADMIN = 'xidmetal_access_admin';
export const REFRESH_COOKIE_ADMIN = 'xidmetal_refresh_admin';

export function accessCookieName(clientApp: ClientApp): string {
  return clientApp === CLIENT_APP.ADMIN
    ? ACCESS_COOKIE_ADMIN
    : ACCESS_COOKIE_MARKETPLACE;
}

export function refreshCookieName(clientApp: ClientApp): string {
  return clientApp === CLIENT_APP.ADMIN
    ? REFRESH_COOKIE_ADMIN
    : REFRESH_COOKIE_MARKETPLACE;
}

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

function clearCookiePair(
  res: Response,
  base: CookieOptions,
  accessName: string,
  refreshName: string,
): void {
  res.clearCookie(accessName, base);
  res.clearCookie(refreshName, base);
}

/**
 * App-scoped cookies — marketplace və admin eyni API host-da
 * bir-birinin sessiyasını üstünə yazmasın.
 * Legacy cookie adları təmizlənir (ambiguous shared session).
 */
export function setAuthCookies(
  res: Response,
  config: ConfigService,
  tokens: { accessToken: string; refreshToken: string },
  clientApp: ClientApp = CLIENT_APP.MARKETPLACE,
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
  const accessName = accessCookieName(clientApp);
  const refreshName = refreshCookieName(clientApp);

  res.cookie(accessName, tokens.accessToken, {
    ...base,
    maxAge: accessMaxAge,
  });
  res.cookie(refreshName, tokens.refreshToken, {
    ...base,
    maxAge: refreshMaxAge,
  });

  // Köhnə shared adlar — qarışıqlığın qarşısı
  clearCookiePair(res, base, ACCESS_COOKIE, REFRESH_COOKIE);
}

/** Yalnız göstərilən app (və legacy) cookie-lərini sil */
export function clearAuthCookies(
  res: Response,
  config: ConfigService,
  clientApp?: ClientApp,
) {
  const base = baseCookieOptions(config);
  clearCookiePair(res, base, ACCESS_COOKIE, REFRESH_COOKIE);

  if (!clientApp || clientApp === CLIENT_APP.MARKETPLACE) {
    clearCookiePair(res, base, ACCESS_COOKIE_MARKETPLACE, REFRESH_COOKIE_MARKETPLACE);
  }
  if (!clientApp || clientApp === CLIENT_APP.ADMIN) {
    clearCookiePair(res, base, ACCESS_COOKIE_ADMIN, REFRESH_COOKIE_ADMIN);
  }
}

function readCookieValue(
  cookies: Record<string, unknown> | undefined,
  name: string,
): string | undefined {
  const value = cookies?.[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Access JWT cookie — clientApp varsa yalnız o app (+ legacy fallback).
 * Header yoxdursa: marketplace → admin → legacy (Bearer üstünlük ayrıca).
 */
export function readAccessTokenFromCookies(
  req: Request,
  clientApp?: ClientApp,
): string | null {
  const cookies = req.cookies as Record<string, unknown> | undefined;

  if (clientApp) {
    const scoped = readCookieValue(cookies, accessCookieName(clientApp));
    if (scoped) return scoped;
    const legacy = readCookieValue(cookies, ACCESS_COOKIE);
    return legacy ?? null;
  }

  return (
    readCookieValue(cookies, ACCESS_COOKIE_MARKETPLACE) ??
    readCookieValue(cookies, ACCESS_COOKIE_ADMIN) ??
    readCookieValue(cookies, ACCESS_COOKIE) ??
    null
  );
}

export function readRefreshTokenFromRequest(
  req: Request,
  bodyToken?: string,
  clientApp?: ClientApp,
): string | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined;

  if (clientApp) {
    const scoped = readCookieValue(cookies, refreshCookieName(clientApp));
    if (scoped) return scoped;
    const legacy = readCookieValue(cookies, REFRESH_COOKIE);
    if (legacy) return legacy;
  } else {
    const fromCookie =
      readCookieValue(cookies, REFRESH_COOKIE_MARKETPLACE) ??
      readCookieValue(cookies, REFRESH_COOKIE_ADMIN) ??
      readCookieValue(cookies, REFRESH_COOKIE);
    if (fromCookie) return fromCookie;
  }

  if (typeof bodyToken === 'string' && bodyToken.length > 0) {
    return bodyToken;
  }
  return undefined;
}

/** Socket.IO Cookie header-indən access token (app-scoped) */
export function readAccessTokenFromCookieHeader(
  cookieHeader: string,
  clientApp?: ClientApp,
): string | null {
  const names = clientApp
    ? [accessCookieName(clientApp), ACCESS_COOKIE]
    : [ACCESS_COOKIE_MARKETPLACE, ACCESS_COOKIE_ADMIN, ACCESS_COOKIE];

  for (const name of names) {
    const value = parseCookie(cookieHeader, name);
    if (value) return value;
  }
  return null;
}

export function parseCookie(cookieHeader: string, name: string): string | null {
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    const value = part.slice(idx + 1).trim();
    if (value.length === 0) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}
