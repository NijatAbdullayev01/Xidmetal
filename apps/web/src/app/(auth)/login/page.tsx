import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { GuestOnly } from '@/components/auth/guest-only';
import { AuthPageShell } from '@/components/auth/auth-page-shell';

export const metadata: Metadata = {
  title: 'Daxil ol',
  description: 'Xidmetal hesabınıza daxil olun.',
};

export default function LoginPage() {
  return (
    <AuthPageShell
      title="Daxil ol"
      description="Hesabınıza daxil olun və xidmətlərdən istifadə edin"
      maxWidth="md"
    >
      <GuestOnly>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </GuestOnly>
    </AuthPageShell>
  );
}
