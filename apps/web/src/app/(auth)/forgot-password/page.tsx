import type { Metadata } from 'next';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata: Metadata = {
  title: 'Şifrəni unutdum',
  description: 'Xidmətal hesabınız üçün şifrə bərpası.',
};

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell
      title="Şifrəni unutdum"
      description="E-poçt ünvanınızı daxil edin — təsdiq kodu göndərəcəyik"
      maxWidth="md"
    >
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
