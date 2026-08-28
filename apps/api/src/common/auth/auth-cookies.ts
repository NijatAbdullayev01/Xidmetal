import type { CookieOptions, Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { API, CLIENT_APP, type ClientApp } from '@xidmetal/shared';

/** Legacy (pre-namespace) — oxuma fallback; yazıda təmizlənir */
export const ACCESS_COOKIE = 'xidmetal_access';
export const REFRESH_COOKIE = 'xidmetal_refresh';

export const ACCESS_COOKIE_MARKETPLACE = 'xidmetal_access_marketplace';
export const REFRESH_COOKIE_MARKETPLACE = 'xidmetal_refresh_marketplace';
export const ACCESS_COOKIE_ADMIN = 'xidmetal_access_admin';
export const REFRESH_COOKIE_ADMIN = 'xidmetal_refresh_admin';

const HOST_PREFIX = '__Host-';
const REFRESH_COOKIE_PATH = `${API.prefix}/auth`;

function isProduction(config: ConfigService): boolean {
  return config.get<string>('NODE_ENV') === 'production';
}

export function accessCookieName(
  clientApp: ClientApp,
  hostPrefix = false,
): string {
  const base =
    clientApp === CLIENT_APP.ADMIN
      ? ACCESS_COOKIE_ADMIN
      : ACCESS_COOKIE_MARKETPLACE;
  return hostPrefix ? `${HOST_PREFIX}${base}` : base;
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

function accessCookieOptions(config: ConfigService): CookieOptions {
  const isProd = isProduction(config);
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  };
}

function refreshCookieOptions(config: ConfigService): CookieOptions {
  return {
    ...accessCookieOptions(config),
    path: REFRESH_COOKIE_PATH,
  };
}

function clearNamedCookie(
  res: Response,
  options: CookieOptions,
  name: string,
): void {
  res.clearCookie(name, options);
}

/**
 * App-scoped cookies — marketplace və admin eyni API host-da
 * bir-birinin sessiyasını üstünə yazmasın.
 * Production access: `__Host-` (Secure + Path=/ + Domain yox).
 * Refresh: Path yalnız `/api/v1/auth`.
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
  const accessOpts = accessCookieOptions(config);
  const refreshOpts = refreshCookieOptions(config);
  const hostPrefix = isProduction(config);
  const accessName = accessCookieName(clientApp, hostPrefix);
  const refreshName = refreshCookieName(clientApp);

  res.cookie(accessName, tokens.accessToken, {
    ...accessOpts,
    maxAge: accessMaxAge,
  });
  res.cookie(refreshName, tokens.refreshToken, {
    ...refreshOpts,
    maxAge: refreshMaxAge,
  });

  clearNamedCookie(res, accessOpts, ACCESS_COOKIE);
  clearNamedCookie(res, refreshOpts, REFRESH_COOKIE);
  clearNamedCookie(res, accessOpts, REFRESH_COOKIE);
  if (hostPrefix) {
    clearNamedCookie(res, accessOpts, accessCookieName(clientApp, false));
  }
}

/** Yalnız göstərilən app (və legacy) cookie-lərini sil */
export function clearAuthCookies(
  res: Response,
  config: ConfigService,
  clientApp?: ClientApp,
) {
  const accessOpts = accessCookieOptions(config);
  const refreshOpts = refreshCookieOptions(config);

  clearNamedCookie(res, accessOpts, ACCESS_COOKIE);
  clearNamedCookie(res, refreshOpts, REFRESH_COOKIE);
  clearNamedCookie(res, accessOpts, REFRESH_COOKIE);

  const apps: ClientApp[] = clientApp
    ? [clientApp]
    : [CLIENT_APP.MARKETPLACE, CLIENT_APP.ADMIN];

  for (const app of apps) {
    clearNamedCookie(res, accessOpts, accessCookieName(app, false));
    clearNamedCookie(res, accessOpts, accessCookieName(app, true));
    clearNamedCookie(res, refreshOpts, refreshCookieName(app));
    clearNamedCookie(res, accessOpts, refreshCookieName(app));
  }
}

function readCookieValue(
  cookies: Record<string, unknown> | undefined,
  name: string,
): string | undefined {
  const value = cookies?.[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function accessCookieCandidates(clientApp?: ClientApp): string[] {
  if (clientApp) {
    return [
      accessCookieName(clientApp, true),
      accessCookieName(clientApp, false),
      ACCESS_COOKIE,
    ];
  }
  return [
    accessCookieName(CLIENT_APP.MARKETPLACE, true),
    ACCESS_COOKIE_MARKETPLACE,
    accessCookieName(CLIENT_APP.ADMIN, true),
    ACCESS_COOKIE_ADMIN,
    ACCESS_COOKIE,
  ];
}

/**
 * Access JWT cookie — clientApp varsa yalnız o app (+ legacy fallback).
 */
export function readAccessTokenFromCookies(
  req: Request,
  clientApp?: ClientApp,
): string | null {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  for (const name of accessCookieCandidates(clientApp)) {
    const value = readCookieValue(cookies, name);
    if (value) return value;
  }
  return null;
}

export function readRefreshTokenFromRequest(
  req: Request,
  bodyToken?: string,
  clientApp?: ClientApp,
): string | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const names = clientApp
    ? [refreshCookieName(clientApp), REFRESH_COOKIE]
    : [REFRESH_COOKIE_MARKETPLACE, REFRESH_COOKIE_ADMIN, REFRESH_COOKIE];

  for (const name of names) {
    const value = readCookieValue(cookies, name);
    if (value) return value;
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
  for (const name of accessCookieCandidates(clientApp)) {
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
