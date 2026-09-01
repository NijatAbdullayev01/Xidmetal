import type { Metadata } from 'next';
import { UserRole } from '@xidmetal/shared';
import { RegisterView } from '@/components/auth/register-view';

export const metadata: Metadata = {
  title: 'Xidmət verən qeydiyyatı',
  description: 'Xidmətal platformasında xidmət verən kimi qeydiyyatdan keçin.',
};

export default function RegisterPage() {
  return <RegisterView defaultRole={UserRole.PROVIDER} />;
}
