import { UserRole } from '@xidmetal/shared';

/** Marketplace web — yalnız CUSTOMER; PROVIDER və ADMIN ayrı origin-lərdədir */
export function getPostAuthRedirectPath(role: UserRole): string {
  switch (role) {
    case UserRole.CUSTOMER:
      return '/dashboard/customer';
    case UserRole.PROVIDER:
    case UserRole.ADMIN:
    default:
      return '/login';
  }
}

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case UserRole.CUSTOMER:
      return '/dashboard/customer';
    case UserRole.PROVIDER:
    case UserRole.ADMIN:
    default:
      return '/login';
  }
}

export function getAdminAppUrl(): string {
  return process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3121';
}

export function getProviderAppUrl(): string {
  return process.env.NEXT_PUBLIC_PROVIDER_URL ?? 'http://localhost:3122';
}

/** Dev/test — qeydiyyat cavabındakı OTP-ni verify səhifəsinə ötürmək üçün */
const DEV_EMAIL_CODE_KEY = 'xidmetal:dev-verify-email-code';

export function stashDevEmailCode(code: string | undefined): void {
  if (typeof window === 'undefined' || !code) return;
  sessionStorage.setItem(DEV_EMAIL_CODE_KEY, code);
}

export function takeDevEmailCode(): string | null {
  if (typeof window === 'undefined') return null;
  const code = sessionStorage.getItem(DEV_EMAIL_CODE_KEY);
  if (code) sessionStorage.removeItem(DEV_EMAIL_CODE_KEY);
  return code;
}
