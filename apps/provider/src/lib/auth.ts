import { UserRole } from '@xidmetal/shared';

/** Provider panel — CUSTOMER/ADMIN buraya yönləndirilmir (ayrı origin) */
export function getPostAuthRedirectPath(role: UserRole): string {
  switch (role) {
    case UserRole.PROVIDER:
      return '/dashboard/provider';
    case UserRole.CUSTOMER:
    case UserRole.ADMIN:
    default:
      return '/login';
  }
}

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case UserRole.PROVIDER:
      return '/dashboard/provider';
    case UserRole.CUSTOMER:
    case UserRole.ADMIN:
    default:
      return '/login';
  }
}

export function getMarketplaceAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3120';
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
