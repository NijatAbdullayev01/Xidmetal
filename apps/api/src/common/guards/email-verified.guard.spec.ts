import { describe, expect, it } from 'vitest';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { EmailVerifiedGuard } from './index';
import { REQUIRE_EMAIL_VERIFIED_KEY } from '../decorators';
import { UserRole } from '@xidmetal/shared';

function makeContext(user: { role?: string; isVerified?: boolean } | undefined) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  };
}

describe('EmailVerifiedGuard', () => {
  it('metadata yoxdursa keçir', () => {
    const reflector = {
      getAllAndOverride: () => false,
    } as unknown as Reflector;
    const guard = new EmailVerifiedGuard(reflector);
    expect(guard.canActivate(makeContext(undefined) as never)).toBe(true);
  });

  it('təsdiqlənmiş user keçir', () => {
    const reflector = {
      getAllAndOverride: (key: string) => key === REQUIRE_EMAIL_VERIFIED_KEY,
    } as unknown as Reflector;
    const guard = new EmailVerifiedGuard(reflector);
    expect(
      guard.canActivate(
        makeContext({ role: UserRole.CUSTOMER, isVerified: true }) as never,
      ),
    ).toBe(true);
  });

  it('təsdiqlənməmiş user-i rədd edir', () => {
    const reflector = {
      getAllAndOverride: (key: string) => key === REQUIRE_EMAIL_VERIFIED_KEY,
    } as unknown as Reflector;
    const guard = new EmailVerifiedGuard(reflector);
    expect(() =>
      guard.canActivate(
        makeContext({ role: UserRole.CUSTOMER, isVerified: false }) as never,
      ),
    ).toThrow(ForbiddenException);
  });

  it('ADMIN bypass', () => {
    const reflector = {
      getAllAndOverride: (key: string) => key === REQUIRE_EMAIL_VERIFIED_KEY,
    } as unknown as Reflector;
    const guard = new EmailVerifiedGuard(reflector);
    expect(
      guard.canActivate(
        makeContext({ role: UserRole.ADMIN, isVerified: false }) as never,
      ),
    ).toBe(true);
  });
});
