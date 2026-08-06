import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@xidmetal/shared';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Yazma əməliyyatları üçün e-poçt təsdiqi məcburidir (ADMIN istisna) */
export const REQUIRE_EMAIL_VERIFIED_KEY = 'requireEmailVerified';
export const RequireEmailVerified = () => SetMetadata(REQUIRE_EMAIL_VERIFIED_KEY, true);

export const CURRENT_USER_KEY = 'currentUser';

export { CurrentUser } from './current-user.decorator';