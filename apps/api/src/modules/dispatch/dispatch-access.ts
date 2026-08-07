import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@xidmetal/shared';

/** Admin-only dispatch offer list — RolesGuard + service defense-in-depth. */
export function assertDispatchAdminList(role: string): void {
  if (role !== UserRole.ADMIN) {
    throw new ForbiddenException('Bu əməliyyat üçün icazəniz yoxdur');
  }
}
