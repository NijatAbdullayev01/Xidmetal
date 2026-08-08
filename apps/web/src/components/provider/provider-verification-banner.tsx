'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { buttonStyles } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { cn } from '@/lib/utils';

/**
 * Xidmət verən admin təsdiqi gözləyirsə dashboard-da göstərilir.
 * `/users/me` ilə sinxron — auth store login zamanı köhnə ola bilər.
 */
export function ProviderVerificationBanner({ className }: { className?: string }) {
  const token = useAuthToken();
  const updateUser = useAuthStore((s) => s.updateUser);
  const authProfile = useAuthStore((s) => s.user?.providerProfile);

  const { data: me } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => api.users.me(token!),
    enabled: !!token,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!me?.providerProfile) return;
    updateUser({ providerProfile: me.providerProfile });
  }, [me, updateUser]);

  const profile = me?.providerProfile ?? authProfile;
  if (!profile || profile.isVerified) return null;

  return (
    <div
      className={cn(
        'rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 dark:border-amber-700/50 dark:bg-amber-950/30',
        className,
      )}
      role="status"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <ShieldAlert
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Hesabınız hələ təsdiqlənməyib
            </p>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
              Admin təsdiqinə qədər xidmətlərinizi aktivləşdirə, onlayn ola və sifariş
              qəbul edə bilməzsiniz. Profilinizi tamamlayın — komandamız qısa zamanda
              yoxlayacaq.
            </p>
          </div>
        </div>
        <Link
          href="/provider/guide"
          className={cn(
            buttonStyles('outline', 'sm'),
            'min-h-11 shrink-0 border-amber-400/60 bg-white/60 dark:bg-amber-950/40',
          )}
        >
          Bələdçiyə bax
        </Link>
      </div>
    </div>
  );
}
