'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import type { ServiceSummary } from '@xidmetal/shared';
import { buttonStyles } from '@/components/ui/button';
import { useAuthHydrated } from '@/hooks/use-auth-hydrated';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const BookServiceDialog = dynamic(
  () =>
    import('@/components/services/book-service-dialog').then((mod) => ({
      default: mod.BookServiceDialog,
    })),
  { ssr: false },
);

export const PENDING_BOOKING_SERVICE_KEY = 'xidmetal-pending-booking-service';

interface ServiceOrderButtonProps {
  service: ServiceSummary;
  className?: string;
}

export function ServiceOrderButton({ service, className }: ServiceOrderButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuthHydrated();
  const accessToken = useAuthStore((state) => (state.session && state.user ? 'session' : null));
  const userId = useAuthStore((state) => state.user?.id);
  const [open, setOpen] = useState(false);
  const pendingHandledRef = useRef(false);

  const isAuthenticated = !!accessToken;
  const isOwnService = hydrated && isAuthenticated && userId === service.providerId;

  useEffect(() => {
    if (!hydrated || !isAuthenticated || pendingHandledRef.current) return;

    const pendingServiceId = sessionStorage.getItem(PENDING_BOOKING_SERVICE_KEY);
    if (pendingServiceId !== service.id) return;

    pendingHandledRef.current = true;
    sessionStorage.removeItem(PENDING_BOOKING_SERVICE_KEY);
    setOpen(true);
  }, [hydrated, isAuthenticated, service.id]);

  const handleClick = () => {
    if (!hydrated) return;

    if (!isAuthenticated) {
      sessionStorage.setItem(PENDING_BOOKING_SERVICE_KEY, service.id);
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (userId === service.providerId) return;

    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={!hydrated || isOwnService}
        title={isOwnService ? 'Öz xidmətinizə sifariş verə bilməzsiniz' : undefined}
        className={cn(
          buttonStyles('default', 'sm'),
          'shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-[1.02]',
          (!hydrated || isOwnService) && 'cursor-not-allowed opacity-60',
          className,
        )}
      >
        Sifariş et
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </button>

      {open ? (
        <BookServiceDialog service={service} open onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
