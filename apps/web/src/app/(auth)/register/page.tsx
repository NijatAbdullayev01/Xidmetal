import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/register-form';
import { GuestOnly } from '@/components/auth/guest-only';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
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
    <AuthPageShell
      title="Qeydiyyat"
      description="Hesab növünü seçin və məlumatlarınızı daxil edin"
    >
      <GuestOnly>
        <RegisterForm defaultRole={defaultRole} />
      </GuestOnly>
    </AuthPageShell>
  );
}
