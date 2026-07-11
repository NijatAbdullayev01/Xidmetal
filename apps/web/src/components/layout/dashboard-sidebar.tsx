'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  Briefcase,
  ClipboardList,
  MessageSquare,
  Star,
  LogOut,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import { useScrollLock } from '@/hooks/use-scroll-lock';

const navItems = [
  { href: '/dashboard/provider', label: 'İcmal', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/provider/services/new', label: 'Xidmət ver', icon: PlusCircle },
  { href: '/dashboard/provider/services', label: 'Xidmətlərim', icon: Briefcase },
  { href: '/dashboard/provider/bookings', label: 'Sifarişlər', icon: ClipboardList },
  { href: '/dashboard/provider/messages', label: 'Mesajlarım', icon: MessageSquare },
  { href: '/dashboard/provider/ratings', label: 'Reytinq', icon: Star },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();

  useScrollLock(mobileOpen);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const closeMobile = () => setMobileOpen(false);

  const activeHref = navItems.reduce<string | null>((best, item) => {
    const matches = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

    if (!matches) return best;
    if (!best || item.href.length > best.length) return item.href;
    return best;
  }, null);

  const navContent = (
    <nav className="flex flex-1 flex-col gap-1 p-4" aria-label="Kabinet naviqasiyası">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeMobile}
            className={cn(
              'flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-brand text-brand-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const mobileUserBlock = (
    <div className="border-t border-border p-4 safe-bottom">
      <div className="mb-3 flex items-center gap-3 rounded-lg bg-muted px-3 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/20 text-sm font-semibold text-brand-foreground">
          {user?.firstName?.[0]}
          {user?.lastName?.[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-muted-foreground">Xidmət verən</p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full min-h-[44px]"
        onClick={() => {
          closeMobile();
          logout();
        }}
      >
        <LogOut className="h-4 w-4" />
        Çıxış
      </Button>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-40 flex h-14 min-h-[3.5rem] items-center justify-between border-b border-border bg-background px-4 safe-top lg:hidden">
        <Link
          href="/"
          className="flex min-h-[44px] items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="sm:inline">Geri qayıt</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md hover:bg-muted"
            aria-expanded={mobileOpen}
            aria-controls="dashboard-mobile-nav"
            aria-label={mobileOpen ? 'Menyunu bağla' : 'Menyunu aç'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 top-14 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
            aria-label="Menyunu bağla"
            onClick={closeMobile}
          />
          <div
            id="dashboard-mobile-nav"
            className="fixed inset-x-0 top-14 z-50 flex max-h-[calc(100dvh-3.5rem)] flex-col overflow-y-auto overscroll-contain border-b border-border bg-card shadow-lg lg:hidden"
          >
            {navContent}
            {mobileUserBlock}
          </div>
        </>
      )}

      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center border-b border-border px-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Geri qayıt
          </Link>
        </div>

        {navContent}

        <div className="mt-auto border-t border-border p-4">
          <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground">Xidmət verən</p>
            </div>
            <ThemeToggle />
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Çıxış
          </Button>
        </div>
      </aside>
    </>
  );
}
