'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { LoginForm } from '@/components/auth/login-form';
import { useAuthHydrated } from '@/hooks/use-auth-hydrated';
import { getPostAuthRedirectPath } from '@/lib/auth';
import { useAuthStore } from '@/store/auth.store';

function LoginViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useAuthHydrated();
  const isAuthenticated = useAuthStore((state) => !!state.tokens?.accessToken);
  const user = useAuthStore((state) => state.user);
  const showSuccess = hydrated && isAuthenticated;

  useEffect(() => {
    if (!showSuccess || !user) return;

    const redirect = searchParams.get('redirect');
    router.replace(
      redirect && redirect.startsWith('/') ? redirect : getPostAuthRedirectPath(user.role),
    );
  }, [showSuccess, user, searchParams, router]);

  return (
    <AuthPageShell
      title={showSuccess ? 'Xoş gəldiniz!' : 'Daxil ol'}
      description={
        showSuccess
          ? 'Uğurla daxil oldunuz. Sizi hesabınıza yönləndiririk…'
          : 'Hesabınıza daxil olun və xidmətlərdən istifadə edin'
      }
      maxWidth="md"
    >
      {showSuccess ? (
        <div className="flex flex-col items-center gap-3 py-2" role="status" aria-live="polite">
          <Loader2 className="h-6 w-6 animate-spin text-brand-dark" aria-hidden />
          <p className="text-sm text-muted-foreground">Zəhmət olmasa gözləyin</p>
        </div>
      ) : hydrated ? (
        <LoginForm />
      ) : null}
    </AuthPageShell>
  );
}

export function LoginView() {
  return (
    <Suspense
      fallback={
        <AuthPageShell
          title="Daxil ol"
          description="Hesabınıza daxil olun və xidmətlərdən istifadə edin"
          maxWidth="md"
        >
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
          </div>
        </AuthPageShell>
      }
    >
      <LoginViewContent />
    </Suspense>
  );
}
