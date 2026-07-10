'use client';

import Link from 'next/link';
import { Logo } from '@/components/layout/logo';
import { Menu, X, Search, User } from 'lucide-react';
import { useState } from 'react';
import { buttonStyles } from '@/components/ui/button';
import { getDashboardPath } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-50 border-b border-brand-dark bg-brand text-brand-foreground">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Xidmetal ana səhifə">
          <Logo priority />
        </Link>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle className="text-brand-foreground hover:bg-brand-dark/20 hover:text-brand-foreground" />

          {isAuthenticated() ? (
            <div className="flex items-center gap-3">
              <Link
                href={user ? getDashboardPath(user.role) : '/dashboard'}
                className="flex items-center gap-2 rounded-md border !border-[#000000] px-3 py-2 text-sm font-medium hover:bg-brand-dark/20"
              >
                <User className="h-4 w-4" />
                {user?.firstName}
              </Link>
              <Button
                variant="default"
                onClick={logout}
                className="h-auto rounded-md border border-transparent px-3 py-2 text-sm font-medium shadow-none bg-brand-foreground text-brand hover:bg-brand-foreground/90"
              >
                Çıxış
              </Button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonStyles('ghost', 'sm'), 'text-brand-foreground hover:bg-brand-dark/20')}
              >
                Daxil ol
              </Link>
              <Link
                href="/register"
                className={cn(
                  buttonStyles('default', 'sm'),
                  'bg-brand-foreground text-brand hover:bg-brand-foreground/90',
                )}
              >
                Qeydiyyat
              </Link>
            </>
          )}
        </div>

        <button
          className="rounded-md p-2 hover:bg-brand-dark/20 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menyu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-brand-dark px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Link
                href="/search"
                className="flex flex-1 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-brand-dark/20"
                onClick={() => setMobileOpen(false)}
              >
                <Search className="h-4 w-4" />
                Axtar
              </Link>
              <ThemeToggle className="text-brand-foreground hover:bg-brand-dark/20 hover:text-brand-foreground" />
            </div>
            {!isAuthenticated() && (
              <div className="mt-2 flex flex-col gap-2 border-t border-brand-dark pt-4">
                <Link
                  href="/login"
                  className={cn(
                    buttonStyles('outline', 'md'),
                    'border-brand-foreground/30 bg-transparent text-brand-foreground hover:bg-brand-dark/20',
                  )}
                >
                  Daxil ol
                </Link>
                <Link
                  href="/register"
                  className={cn(
                    buttonStyles('default', 'md'),
                    'bg-brand-foreground text-brand hover:bg-brand-foreground/90',
                  )}
                >
                  Qeydiyyat
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
