import { describe, expect, it } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { CLIENT_APP, UserRole } from '@xidmetal/shared';
import { AuthService } from '../../modules/auth/auth.service';

/** assertClientAudience təmiz pure qayda — service instance olmadan yoxlamaq üçün mirror */
function assertClientAudience(
  role: string,
  clientApp?: (typeof CLIENT_APP)[keyof typeof CLIENT_APP],
): void {
  // AuthService ilə eyni məntiq
  const svc = Object.create(AuthService.prototype) as AuthService;
  svc.assertClientAudience(role, clientApp);
}

describe('assertClientAudience', () => {
  it('marketplace + ADMIN → Forbidden', () => {
    expect(() =>
      assertClientAudience(UserRole.ADMIN, CLIENT_APP.MARKETPLACE),
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

  it('clientApp yoxdursa — geriyə uyğun OK', () => {
    expect(() => assertClientAudience(UserRole.ADMIN, undefined)).not.toThrow();
  });
});
