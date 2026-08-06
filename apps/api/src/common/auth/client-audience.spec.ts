import { describe, expect, it } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { CLIENT_APP, UserRole } from '@xidmetal/shared';
import { AuthService } from '../../modules/auth/auth.service';

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

  it('admin + ADMIN → OK', () => {
    expect(() =>
      assertClientAudience(UserRole.ADMIN, CLIENT_APP.ADMIN),
    ).not.toThrow();
  });
});
