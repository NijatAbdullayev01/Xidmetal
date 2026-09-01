import type { Metadata } from 'next';
import { LoginView } from '@/components/auth/login-view';

export const metadata: Metadata = {
  title: 'Daxil ol',
  description: 'Xidmət verən panelinə daxil olun.',
};

export default function LoginPage() {
  return <LoginView />;
}
