'use client';

import Link from 'next/link';
import { MailWarning } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

/** Login soft qalır; yazma API-ləri e-poçt təsdiqi tələb edir */
export function EmailVerifyBanner() {
  const user = useAuthStore((state) => state.user);

  if (!user || user.isVerified) {
    return null;
  }

  return (
    <div
      role="status"
      className="border-b border-amber-300/70 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-50"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-sm">
          <MailWarning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            E-poçt ünvanınız təsdiqlənməyib. Sifariş, mesaj, rəy və şəkil yükləmək üçün{' '}
            <strong className="font-semibold">{user.email}</strong> ünvanını təsdiqləyin.
          </p>
        </div>
        <Link
          href="/verify-email"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-foreground hover:bg-brand-dark"
        >
          E-poçtu təsdiqlə
        </Link>
      </div>
    </div>
  );
}
