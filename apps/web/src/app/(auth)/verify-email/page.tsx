import type { Metadata } from 'next';
import { VerifyEmailView } from '@/components/auth/verify-email-view';

export const metadata: Metadata = {
  title: 'E-poçt təsdiqi',
  description: 'Xidmətal hesabınızın e-poçtunu təsdiqləyin.',
};

export default function VerifyEmailPage() {
  return <VerifyEmailView />;
}
