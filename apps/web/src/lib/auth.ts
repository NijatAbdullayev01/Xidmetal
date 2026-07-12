import { UserRole } from '@xidmetal/shared';
import type { PublicUserRole } from '@/components/auth/register-schema';

export function parseRoleFromQuery(role: string | null | undefined): PublicUserRole {
  const normalized = role?.toLowerCase();
  if (normalized === 'provider') return UserRole.PROVIDER;
  if (normalized === 'customer') return UserRole.CUSTOMER;
  return UserRole.CUSTOMER;
}

export function getPostAuthRedirectPath(role: UserRole): string {
  switch (role) {
    case UserRole.PROVIDER:
      return '/dashboard/provider';
    case UserRole.CUSTOMER:
      return '/dashboard/customer';
    case UserRole.ADMIN:
    default:
      return '/dashboard';
  }
}

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case UserRole.PROVIDER:
      return '/dashboard/provider';
    case UserRole.CUSTOMER:
      return '/dashboard/customer';
    case UserRole.ADMIN:
    default:
      return '/dashboard';
  }
}
