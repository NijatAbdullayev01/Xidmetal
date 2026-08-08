'use client';

import { useState, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { UserRole } from '@xidmetal/shared';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useAuthHydrated } from '@/hooks/use-auth-hydrated';
import { useAuthStore } from '@/store/auth.store';

const PROVIDER_REGISTER_HREF = '/register?role=provider';
const PROVIDER_DASHBOARD_HREF = '/dashboard/provider';

/**
 * Məhsul qərarı: bir hesab = bir rol. CUSTOMER → PROVIDER upgrade yoxdur.
 * Mövcud müştəriyə ayrı hesab lazım olduğunu izah edir — bu axını dəyişmə.
 */
const CUSTOMER_MESSAGE =
  'Artıq siz bu profillə müştəri kimi qeydiyyat etmişsiniz. Əgər xidmət verən olmaq istəyirsinizsə, başqa hesab yaradın.';

interface BecomeProviderLinkProps {
  children: ReactNode;
  className?: string;
}

export function BecomeProviderLink({ children, className }: BecomeProviderLinkProps) {
  const hydrated = useAuthHydrated();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.session && !!state.user);
  const [open, setOpen] = useState(false);

  const isCustomer = hydrated && isAuthenticated && user?.role === UserRole.CUSTOMER;
  const isProvider = hydrated && isAuthenticated && user?.role === UserRole.PROVIDER;

  const href = isProvider ? PROVIDER_DASHBOARD_HREF : PROVIDER_REGISTER_HREF;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isCustomer) return;
    event.preventDefault();
    setOpen(true);
  };

  return (
    <>
      <Link href={href} className={className} onClick={handleClick}>
        {children}
      </Link>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Xidmət verən olmaq"
        description={CUSTOMER_MESSAGE}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <h2 className="text-lg font-semibold">Xidmət verən olmaq</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Bağla"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-5 sm:px-6">
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            {CUSTOMER_MESSAGE}
          </p>
          <div className="mt-6 flex justify-end">
            <Button type="button" onClick={() => setOpen(false)}>
              Anladım
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
