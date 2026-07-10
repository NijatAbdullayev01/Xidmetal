import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';
import { GuestOnly } from '@/components/auth/guest-only';

export const metadata: Metadata = {
  title: 'Daxil ol',
  description: 'Xidmetal hesabınıza daxil olun.',
};

export default function LoginPage() {
  return (
    <section className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand/5 to-background px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Daxil ol</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Hesabınıza daxil olun və xidmətlərdən istifadə edin
            </p>
          </div>

          <div className="mt-8">
            <GuestOnly>
              <LoginForm />
            </GuestOnly>
          </div>
        </div>
      </div>
    </section>
  );
}
