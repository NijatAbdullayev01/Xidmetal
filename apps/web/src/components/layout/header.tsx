'use client';

import Link from 'next/link';
import { Logo } from '@/components/layout/logo';
import { User, LogOut } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';
import { getDashboardPath } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/use-logout';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function Header() {
  const { user, isAuthenticated } = useAuthStore();
  const logout = useLogout();

  const profileHref = isAuthenticated()
    ? user
      ? getDashboardPath(user.role)
      : '/dashboard'
    : '/login';

  const authSection = isAuthenticated() ? (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <Link
        href={user ? getDashboardPath(user.role) : '/dashboard'}
        className="flex items-center justify-center gap-2 rounded-md border !border-[#000000] px-3 py-2.5 text-sm font-medium hover:bg-brand-dark/20 sm:justify-start sm:py-2"
      >
        <User className="h-4 w-4 shrink-0" />
        <span className="truncate">{user?.firstName}</span>
      </Link>
      <Button
        variant="default"
        onClick={() => logout()}
        className="h-auto w-full min-h-[44px] rounded-md border border-transparent px-3 py-2.5 text-sm font-medium shadow-none bg-brand-foreground text-brand hover:bg-brand-foreground/90 lg:w-auto lg:min-h-0 lg:py-2"
      >
        <LogOut className="h-4 w-4 lg:hidden" />
        Çıxış
      </Button>
    </div>
  ) : (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <Link
        href="/login"
        className={cn(
          buttonStyles('ghost', 'sm'),
          'justify-center text-brand-foreground hover:bg-brand-dark/20 sm:w-auto',
        )}
      >
        Daxil ol
      </Link>
      <Link
        href="/register"
        className={cn(
          buttonStyles('default', 'sm'),
          'justify-center bg-brand-foreground text-brand hover:bg-brand-foreground/90 sm:w-auto',
        )}
      >
        Qeydiyyat
      </Link>
    </div>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-brand-dark bg-brand text-brand-foreground safe-top">
      <div className="mx-auto flex h-14 min-h-[3.5rem] max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Xidmetal ana səhifə">
          <Logo priority />
        </Link>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle className="text-brand-foreground hover:bg-brand-dark/20 hover:text-brand-foreground" />
          {authSection}
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle className="text-brand-foreground hover:bg-brand-dark/20 hover:text-brand-foreground" />
          <Link
            href={profileHref}
            className="rounded-md p-2 transition-colors hover:bg-brand-dark/20"
            aria-label={isAuthenticated() ? 'Profil' : 'Daxil ol'}
          >
            <User className="h-6 w-6" />
          </Link>
          {isAuthenticated() && (
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-md p-2 transition-colors hover:bg-brand-dark/20"
              aria-label="Çıxış"
            >
              <LogOut className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
