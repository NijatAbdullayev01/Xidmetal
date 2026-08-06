import type { Metadata } from 'next';
import { ResetPasswordView } from '@/components/auth/reset-password-view';

export const metadata: Metadata = {
  title: 'Yeni şifrə',
  description: 'Xidmətal hesabınız üçün yeni şifrə təyin edin.',
};

export default function ResetPasswordPage() {
  return <ResetPasswordView />;
}
