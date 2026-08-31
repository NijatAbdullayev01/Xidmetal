'use client';

import Link from 'next/link';
import { Logo } from '@/components/layout/logo';
import { User, LogOut } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';
import { getDashboardPath } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useAuthHydrated } from '@/hooks/use-auth-hydrated';
import { useLogout } from '@/hooks/use-logout';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useMessageNotifications } from '@/hooks/use-message-notifications';
import { useBookingNotifications } from '@/hooks/use-booking-notifications';
import { useNotifications } from '@/hooks/use-notifications';

/** Profil düyməsinin küncündə yanıb-sönən diqqət siqnalı */
function AttentionSignal({ active, label }: { active: boolean; label: string }) {
  if (!active) return null;

  return (
    <span
      className="pointer-events-none absolute -right-1 -top-1 flex h-2.5 w-2.5"
      aria-label={label}
      role="status"
    >
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-brand" />
    </span>
  );
}

export function Header() {
  const hydrated = useAuthHydrated();
  // `tokens` birbaşa seçilir — `isAuthenticated()` funksiya referansı sabit
  // olduğu üçün Zustand state dəyişikliyini aşkarlaya bilmirdi.
  const isAuthenticated = useAuthStore((state) => state.session && !!state.user);
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  // Persist localStorage-dan client-də sinxron rehydrate edir; server isə
  // həmişə boş state görür. Hydration bitənə qədər guest UI — mismatch olmasın.
  const authed = hydrated && isAuthenticated;

  const { unreadCount } = useMessageNotifications(authed);
  const { attentionCount } = useBookingNotifications(authed);
  const { unreadCount: adminUnread } = useNotifications(authed);
  const hasAttention = unreadCount + attentionCount + adminUnread > 0;
  const attentionLabel =
    unreadCount > 0 && attentionCount > 0
      ? 'Yeni mesaj və sifariş bildirişi var'
      : unreadCount > 0
        ? 'Yeni mesajınız var'
        : attentionCount > 0
          ? 'Yeni sifariş bildirişiniz var'
          : 'Yeni bildirişiniz var';

  const profileHref = authed
    ? user
      ? getDashboardPath(user.role)
      : '/dashboard'
    : '/login';

  const authSection = authed ? (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <Link
        href={user ? getDashboardPath(user.role) : '/dashboard'}
        prefetch
        className="relative flex items-center justify-center gap-2 rounded-md border !border-[#000000] px-3 py-2.5 text-sm font-medium hover:bg-brand-dark/20 sm:justify-start sm:py-2"
        aria-label={
          hasAttention ? `${user?.firstName ?? 'Profil'} — ${attentionLabel}` : undefined
        }
      >
        <User className="h-4 w-4 shrink-0" />
        <span className="truncate">{user?.firstName}</span>
        <AttentionSignal active={hasAttention} label={attentionLabel} />
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
        <Link href="/" className="flex shrink-0 items-center" aria-label="Xidmətal ana səhifə">
          <Logo priority />
        </Link>

        <nav
          aria-label="Əsas"
          className="flex min-w-0 flex-1 items-center justify-center gap-0.5 sm:gap-1"
        >
          <Link
            href="/services"
            className="rounded-md px-2 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-dark/20 sm:px-3"
          >
            Xidmətlər
          </Link>
          <Link
            href="/categories"
            className="rounded-md px-2 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-dark/20 sm:px-3"
          >
            Kateqoriyalar
          </Link>
          <Link
            href="/how-it-works"
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-dark/20 lg:inline-flex"
          >
            Necə işləyir?
          </Link>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle className="text-brand-foreground hover:bg-brand-dark/20 hover:text-brand-foreground" />
          {authSection}
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle className="text-brand-foreground hover:bg-brand-dark/20 hover:text-brand-foreground" />
          <Link
            href={profileHref}
            prefetch
            className="relative rounded-md p-2 transition-colors hover:bg-brand-dark/20"
            aria-label={
              authed
                ? hasAttention
                  ? `Profil — ${attentionLabel}`
                  : 'Profil'
                : 'Daxil ol'
            }
          >
            <User className="h-6 w-6" />
            <AttentionSignal active={authed && hasAttention} label={attentionLabel} />
          </Link>
          {authed && (
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
