'use client';

import { useState, type MouseEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { UserRole } from '@xidmetal/shared';
import { Button, buttonStyles } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useAuthHydrated } from '@/hooks/use-auth-hydrated';
import { useAuthStore } from '@/store/auth.store';
import { getProviderAppUrl } from '@/lib/auth';

const providerRegisterHref = () => `${getProviderAppUrl()}/register`;

/**
 * Məhsul qərarı: bir hesab = bir rol. CUSTOMER → PROVIDER upgrade yoxdur.
 * Xidmət verənlər ayrı panelə (apps/provider) qeydiyyatdan keçir.
 * Mövcud xidmət alana ayrı hesab lazım olduğunu izah edir.
 */
const CUSTOMER_MESSAGE =
  'Artıq siz bu profillə xidmət alan kimi qeydiyyat etmisiniz. Xidmət verən olmaq üçün ayrıca hesab yaradın.';

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

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isCustomer) return;
    event.preventDefault();
    setOpen(true);
  };

  return (
    <>
      <a href={providerRegisterHref()} className={className} onClick={handleClick}>
        {children}
      </a>

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
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Bağla
            </Button>
            <a href={providerRegisterHref()} className={buttonStyles('default', 'md')}>
              Xidmət verən panelinə keç
            </a>
          </div>
        </div>
      </Modal>
    </>
  );
}
