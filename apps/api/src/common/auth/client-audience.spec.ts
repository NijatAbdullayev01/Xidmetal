import { describe, expect, it } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { CLIENT_APP, UserRole } from '@xidmetal/shared';
import { AuthService } from '../../modules/auth/auth.service';
import {
  assertSessionAudience,
  normalizeTokenAudience,
} from './client-audience';
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_ADMIN,
  ACCESS_COOKIE_MARKETPLACE,
  ACCESS_COOKIE_PROVIDER,
  accessCookieName,
  parseCookie,
  readAccessTokenFromCookieHeader,
  refreshCookieName,
} from './auth-cookies';

function assertClientAudience(
  role: string,
  clientApp: (typeof CLIENT_APP)[keyof typeof CLIENT_APP],
): void {
  const svc = Object.create(AuthService.prototype) as AuthService;
  svc.assertClientAudience(role, clientApp);
}

describe('assertClientAudience', () => {
  it('marketplace + ADMIN → Forbidden', () => {
    expect(() =>
      assertClientAudience(UserRole.ADMIN, CLIENT_APP.MARKETPLACE),
    ).toThrow(ForbiddenException);
  });

  it('marketplace + PROVIDER → Forbidden', () => {
    expect(() =>
      assertClientAudience(UserRole.PROVIDER, CLIENT_APP.MARKETPLACE),
    ).toThrow(ForbiddenException);
  });

  it('provider + CUSTOMER → Forbidden', () => {
    expect(() =>
      assertClientAudience(UserRole.CUSTOMER, CLIENT_APP.PROVIDER),
    ).toThrow(ForbiddenException);
  });

  it('admin + CUSTOMER → Forbidden', () => {
    expect(() =>
      assertClientAudience(UserRole.CUSTOMER, CLIENT_APP.ADMIN),
    ).toThrow(ForbiddenException);
  });

  it('marketplace + CUSTOMER → OK', () => {
    expect(() =>
      assertClientAudience(UserRole.CUSTOMER, CLIENT_APP.MARKETPLACE),
    ).not.toThrow();
  });

  it('provider + PROVIDER → OK', () => {
    expect(() =>
      assertClientAudience(UserRole.PROVIDER, CLIENT_APP.PROVIDER),
    ).not.toThrow();
  });

  it('admin + ADMIN → OK', () => {
    expect(() =>
      assertClientAudience(UserRole.ADMIN, CLIENT_APP.ADMIN),
    ).not.toThrow();
  });
});

describe('normalizeTokenAudience', () => {
  it('string aud', () => {
    expect(normalizeTokenAudience('marketplace')).toBe(CLIENT_APP.MARKETPLACE);
    expect(normalizeTokenAudience('provider')).toBe(CLIENT_APP.PROVIDER);
    expect(normalizeTokenAudience('admin')).toBe(CLIENT_APP.ADMIN);
  });

  it('array aud', () => {
    expect(normalizeTokenAudience(['marketplace'])).toBe(CLIENT_APP.MARKETPLACE);
  });

  it('naməlum → undefined', () => {
    expect(normalizeTokenAudience('other')).toBeUndefined();
    expect(normalizeTokenAudience(undefined)).toBeUndefined();
  });
});

describe('assertSessionAudience', () => {
  it('header ≠ aud → Forbidden (http)', () => {
    expect(() =>
      assertSessionAudience({
        headerApp: CLIENT_APP.MARKETPLACE,
        tokenAud: CLIENT_APP.ADMIN,
        role: UserRole.ADMIN,
        mode: 'http',
      }),
    ).toThrow(ForbiddenException);
  });

  it('header ≠ aud → WsException (ws)', () => {
    expect(() =>
      assertSessionAudience({
        headerApp: CLIENT_APP.MARKETPLACE,
        tokenAud: CLIENT_APP.ADMIN,
        role: UserRole.ADMIN,
        mode: 'ws',
      }),
    ).toThrow(WsException);
  });

  it('marketplace + ADMIN rol → rədd', () => {
    expect(() =>
      assertSessionAudience({
        headerApp: CLIENT_APP.MARKETPLACE,
        tokenAud: CLIENT_APP.MARKETPLACE,
        role: UserRole.ADMIN,
        mode: 'ws',
      }),
    ).toThrow(WsException);
  });

  it('marketplace + PROVIDER → rədd', () => {
    expect(() =>
      assertSessionAudience({
        headerApp: CLIENT_APP.MARKETPLACE,
        tokenAud: CLIENT_APP.MARKETPLACE,
        role: UserRole.PROVIDER,
        mode: 'ws',
      }),
    ).toThrow(WsException);
  });

  it('provider + PROVIDER → OK', () => {
    expect(() =>
      assertSessionAudience({
        headerApp: CLIENT_APP.PROVIDER,
        tokenAud: CLIENT_APP.PROVIDER,
        role: UserRole.PROVIDER,
        mode: 'ws',
      }),
    ).not.toThrow();
  });

  it('provider + CUSTOMER → rədd', () => {
    expect(() =>
      assertSessionAudience({
        headerApp: CLIENT_APP.PROVIDER,
        tokenAud: CLIENT_APP.PROVIDER,
        role: UserRole.CUSTOMER,
        mode: 'http',
      }),
    ).toThrow(ForbiddenException);
  });

  it('header və aud yoxdursa rədd', () => {
    expect(() =>
      assertSessionAudience({
        headerApp: undefined,
        tokenAud: undefined,
        role: UserRole.PROVIDER,
        mode: 'http',
      }),
    ).toThrow(ForbiddenException);
  });

  it('uyğun aud yoxdursa header ilə rol yoxlanır', () => {
    expect(() =>
      assertSessionAudience({
        headerApp: CLIENT_APP.MARKETPLACE,
        tokenAud: undefined,
        role: UserRole.CUSTOMER,
        mode: 'ws',
      }),
    ).not.toThrow();
  });
});

describe('auth cookie namespacing', () => {
  it('app-scoped adlar', () => {
    expect(accessCookieName(CLIENT_APP.MARKETPLACE)).toBe(ACCESS_COOKIE_MARKETPLACE);
    expect(accessCookieName(CLIENT_APP.PROVIDER)).toBe(ACCESS_COOKIE_PROVIDER);
    expect(accessCookieName(CLIENT_APP.ADMIN)).toBe(ACCESS_COOKIE_ADMIN);
    expect(refreshCookieName(CLIENT_APP.ADMIN)).toBe('xidmetal_refresh_admin');
    expect(refreshCookieName(CLIENT_APP.PROVIDER)).toBe('xidmetal_refresh_provider');
  });

  it('Cookie header-dən marketplace token oxuyur (legacy fallback)', () => {
    const header = `${ACCESS_COOKIE}=legacy.jwt; other=1`;
    expect(readAccessTokenFromCookieHeader(header, CLIENT_APP.MARKETPLACE)).toBe(
      'legacy.jwt',
    );
  });

  it('Cookie header-dən scoped marketplace üstünlük', () => {
    const header = `${ACCESS_COOKIE}=legacy.jwt; ${ACCESS_COOKIE_MARKETPLACE}=mkt.jwt; ${ACCESS_COOKIE_ADMIN}=adm.jwt`;
    expect(readAccessTokenFromCookieHeader(header, CLIENT_APP.MARKETPLACE)).toBe(
      'mkt.jwt',
    );
    expect(readAccessTokenFromCookieHeader(header, CLIENT_APP.ADMIN)).toBe('adm.jwt');
  });

  it('parseCookie decode', () => {
    expect(
      parseCookie('a=1; xidmetal_access_marketplace=a%2Eb', ACCESS_COOKIE_MARKETPLACE),
    ).toBe('a.b');
  });
});
