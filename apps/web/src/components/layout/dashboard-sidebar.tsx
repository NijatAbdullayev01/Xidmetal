'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  Briefcase,
  ClipboardList,
  Star,
  LogOut,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard/provider', label: 'İcmal', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/provider/services/new', label: 'Xidmət ver', icon: PlusCircle },
  { href: '/dashboard/provider/services', label: 'Xidmətlərim', icon: Briefcase },
  { href: '/dashboard/provider/bookings', label: 'Sifarişlər', icon: ClipboardList },
  { href: '/dashboard/provider/ratings', label: 'Reytinq', icon: Star },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();

  const activeHref = navItems.reduce<string | null>((best, item) => {
    const matches = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

    if (!matches) return best;
    if (!best || item.href.length > best.length) return item.href;
    return best;
  }, null);

  const navContent = (
    <nav className="flex flex-1 flex-col gap-1 p-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
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

  return (
    <>
      <div className="flex h-16 items-center justify-between border-b border-border px-4 lg:hidden">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Geri qayıt
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-md p-2 hover:bg-muted"
            aria-label="Menyu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-b border-border bg-card lg:hidden">
          {navContent}
          <div className="border-t border-border p-4">
            <Button variant="outline" size="sm" className="w-full" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Çıxış
            </Button>
          </div>
        </div>
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
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
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
