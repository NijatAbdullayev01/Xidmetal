import type { Metadata } from 'next';
import { RegisterView } from '@/components/auth/register-view';
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

  return <RegisterView defaultRole={defaultRole} />;
}
