'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Logo } from '@/components/layout/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { buttonStyles } from '@/components/ui/button';
import { getDashboardPath } from '@/lib/auth';
import { useAuthStore } from '@/store/auth.store';
import { useAuthHydrated } from '@/hooks/use-auth-hydrated';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '#how-it-works', label: 'Necə işləyir' },
  { href: '#categories', label: 'Xidmətlər' },
  { href: '#benefits', label: 'Üstünlüklər' },
  { href: '#faq', label: 'FAQ' },
] as const;

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const hydrated = useAuthHydrated();
  const isAuthenticated = useAuthStore((state) => state.session && !!state.user);
  const user = useAuthStore((state) => state.user);
  const authed = hydrated && isAuthenticated;
  const dashboardHref = authed && user ? getDashboardPath(user.role) : '/login';

  // Mobil menyunu açıq qoyub viewport böyüdüldükdə bağla
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Açıq menyuda səhifə arxa fon skrollunu kilidlə
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Xidmətal ana səhifə">
          <Logo className="h-10 w-auto" variant="transparent" />
        </Link>

        <nav aria-label="Əsas naviqasiya" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle className="text-muted-foreground hover:bg-muted hover:text-foreground" />
          {authed ? (
            <Link
              href={dashboardHref}
              className={cn(
                buttonStyles('default', 'md'),
                'bg-brand-foreground text-brand hover:bg-brand-foreground/90',
              )}
            >
              Kabineti aç
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link href="/login" className={buttonStyles('ghost', 'md')}>
                Daxil ol
              </Link>
              <Link href="/register" className={buttonStyles('default', 'md')}>
                Qeydiyyat
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted lg:hidden"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls="landing-mobile-menu"
          aria-label={open ? 'Menyunu bağla' : 'Menyunu aç'}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div
          id="landing-mobile-menu"
          className="border-t border-border bg-background lg:hidden"
        >
          <nav aria-label="Mobil naviqasiya" className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <div className="space-y-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-4">
              {authed ? (
                <Link
                  href={dashboardHref}
                  onClick={() => setOpen(false)}
                  className={cn(
                    buttonStyles('default', 'lg'),
                    'justify-center bg-brand-foreground text-brand hover:bg-brand-foreground/90',
                  )}
                >
                  Kabineti aç
                  <ArrowRight className="h-5 w-5" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className={cn(buttonStyles('outline', 'lg'), 'justify-center')}
                  >
                    Daxil ol
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className={cn(buttonStyles('default', 'lg'), 'justify-center')}
                  >
                    Qeydiyyat
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
