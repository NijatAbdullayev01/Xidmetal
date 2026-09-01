'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import { UserRole, type CategorySummary } from '@xidmetal/shared';
import { buttonStyles } from '@/components/ui/button';
import { useAuthHydrated } from '@/hooks/use-auth-hydrated';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const UrgentOrderDialog = dynamic(
  () =>
    import('@/components/home/urgent-order-dialog').then((mod) => ({
      default: mod.UrgentOrderDialog,
    })),
  { ssr: false },
);

export const PENDING_URGENT_ORDER_KEY = 'xidmetal-pending-urgent-order';

interface UrgentOrderButtonProps {
  categories?: CategorySummary[];
  className?: string;
}

export function UrgentOrderButton({ categories, className }: UrgentOrderButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuthHydrated();
  const session = useAuthStore((state) => state.session);
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const pendingHandledRef = useRef(false);

  const isAuthenticated = !!session && !!user;

  useEffect(() => {
    if (!hydrated || !isAuthenticated || pendingHandledRef.current) return;
    if (sessionStorage.getItem(PENDING_URGENT_ORDER_KEY) !== '1') return;

    pendingHandledRef.current = true;
    sessionStorage.removeItem(PENDING_URGENT_ORDER_KEY);

    if (user.role !== UserRole.CUSTOMER) return;
    if (!user.isVerified) {
      router.push('/verify-email');
      return;
    }
    setOpen(true);
  }, [hydrated, isAuthenticated, user, router]);

  const handleClick = () => {
    if (!hydrated) return;

    if (!isAuthenticated) {
      sessionStorage.setItem(PENDING_URGENT_ORDER_KEY, '1');
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (user.role !== UserRole.CUSTOMER) {
      return;
    }

    if (!user.isVerified) {
      router.push('/verify-email');
      return;
    }

    setOpen(true);
  };

  const blockedRole =
    hydrated && isAuthenticated && user?.role !== UserRole.CUSTOMER;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={!hydrated || blockedRole}
        title={
          blockedRole
            ? 'Təcili sifariş yalnız xidmət alan hesabı ilə mümkündür'
            : undefined
        }
        className={cn(
          buttonStyles('default', 'lg'),
          'mt-8 min-h-12 w-full max-w-xs shadow-sm sm:w-auto',
          (!hydrated || blockedRole) && 'cursor-not-allowed opacity-60',
          className,
        )}
      >
        <Zap className="h-5 w-5" aria-hidden />
        Təcili sifariş
      </button>

      {open ? (
        <UrgentOrderDialog
          open
          onClose={() => setOpen(false)}
          initialCategories={categories}
        />
      ) : null}
    </>
  );
}
