'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { RegisterForm } from '@/components/auth/register-form';
import type { PublicUserRole } from '@/components/auth/register-schema';
import { useAuthHydrated } from '@/hooks/use-auth-hydrated';
import { getPostAuthRedirectPath } from '@/lib/auth';
import { useAuthStore } from '@/store/auth.store';

interface RegisterViewProps {
  defaultRole: PublicUserRole;
}

export function RegisterView({ defaultRole }: RegisterViewProps) {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const isAuthenticated = useAuthStore((state) => state.session && !!state.user);
  const user = useAuthStore((state) => state.user);
  const showSuccess = hydrated && isAuthenticated;

  useEffect(() => {
    if (!showSuccess || !user) return;
    router.replace(
      user.isVerified ? getPostAuthRedirectPath(user.role) : '/verify-email',
    );
  }, [showSuccess, user, router]);

  return (
    <AuthPageShell
      title={showSuccess ? 'Xoş gəldiniz!' : 'Qeydiyyat'}
      description={
        showSuccess
          ? user?.isVerified
            ? 'Qeydiyyat uğurla tamamlandı. Sizi hesabınıza yönləndiririk…'
            : 'Qeydiyyat uğurla tamamlandı. E-poçt təsdiqinə yönləndirilirsiniz…'
          : 'Hesab növünü seçin və məlumatlarınızı daxil edin'
      }
    >
      {showSuccess ? (
        <div className="flex flex-col items-center gap-3 py-2" role="status" aria-live="polite">
          <Loader2 className="h-6 w-6 animate-spin text-brand-dark" aria-hidden />
          <p className="text-sm text-muted-foreground">Zəhmət olmasa gözləyin</p>
        </div>
      ) : hydrated ? (
        <RegisterForm defaultRole={defaultRole} />
      ) : null}
    </AuthPageShell>
  );
}
