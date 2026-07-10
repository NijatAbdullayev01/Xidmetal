import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/register-form';
import { GuestOnly } from '@/components/auth/guest-only';
import { AuthCloseButton } from '@/components/auth/auth-close-button';
import { parseRoleFromQuery } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Qeydiyyat',
  description: 'Xidmetal platformasında istifadəçi və ya xidmət verən kimi qeydiyyatdan keçin.',
};

interface RegisterPageProps {
  searchParams: Promise<{ role?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const defaultRole = parseRoleFromQuery(params.role);

  return (
    <section className="box-border flex h-[100dvh] items-center justify-center overflow-hidden bg-gradient-to-b from-brand/5 to-background px-4 py-[15px] sm:px-6">
      <div className="w-full max-w-lg">
        <div className="relative rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
          <AuthCloseButton />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Qeydiyyat</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Hesab növünü seçin və məlumatlarınızı daxil edin
            </p>
          </div>

          <div className="mt-8">
            <GuestOnly>
              <RegisterForm defaultRole={defaultRole} />
            </GuestOnly>
          </div>
        </div>
      </div>
    </section>
  );
}
