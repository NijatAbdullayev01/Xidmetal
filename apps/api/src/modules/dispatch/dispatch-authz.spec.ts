import { describe, expect, it } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@xidmetal/shared';
import { assertDispatchAdminList } from './dispatch-access';

describe('assertDispatchAdminList', () => {
  it('ADMIN keçir', () => {
    expect(() => assertDispatchAdminList(UserRole.ADMIN)).not.toThrow();
  });

  it('CUSTOMER / PROVIDER rədd edilir (IDOR qorunması)', () => {
    expect(() => assertDispatchAdminList(UserRole.CUSTOMER)).toThrow(
      ForbiddenException,
    );
    expect(() => assertDispatchAdminList(UserRole.PROVIDER)).toThrow(
      ForbiddenException,
    );
  });
});
