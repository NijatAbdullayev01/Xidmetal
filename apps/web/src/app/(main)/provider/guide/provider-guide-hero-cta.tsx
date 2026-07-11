'use client';

import Link from 'next/link';
import { ArrowRight, Briefcase, LayoutDashboard } from 'lucide-react';
import { UserRole } from '@xidmetal/shared';
import { buttonStyles } from '@/components/ui/button';
import { useAuthHydrated } from '@/hooks/use-auth-hydrated';
import { useAuthStore } from '@/store/auth.store';

export function ProviderGuideHeroCta() {
  const hydrated = useAuthHydrated();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const isProvider =
    hydrated && isAuthenticated() && user?.role === UserRole.PROVIDER;

  if (isProvider) {
    return (
      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link
          href="/dashboard/provider/services/new"
          className={buttonStyles('default', 'lg')}
        >
          Yeni xidmət yarat
          <Briefcase className="h-5 w-5" />
        </Link>
        <Link
          href="/dashboard/provider"
          className={buttonStyles('outline', 'lg')}
        >
          <LayoutDashboard className="h-5 w-5" />
          Kabinetə keç
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
      <Link href="/register?role=provider" className={buttonStyles('default', 'lg')}>
        İndi qeydiyyatdan keç
        <ArrowRight className="h-5 w-5" />
      </Link>
      <Link href="/dashboard/provider" className={buttonStyles('outline', 'lg')}>
        Kabinetə keç
      </Link>
    </div>
  );
}
