'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  ClipboardList,
  Star,
  Settings,
  LogOut,
  Menu,
  X,
  Users,
  FolderTree,
  ShieldCheck,
  Flag,
  Megaphone,
  BarChart3,
  Inbox,
  ScrollText,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/use-logout';
import { cn } from '@/lib/utils';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { useAdminNavAttention } from '@/hooks/use-admin-nav-attention';
import { formatNavAttentionAria, navAttentionCount } from '@/lib/nav-attention';
import { NavAttentionIndicator } from '@/components/layout/nav-attention-indicator';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const ADMIN_NAV: NavItem[] = [
  { href: '/', label: 'İcmal', icon: LayoutDashboard, exact: true },
  { href: '/analytics', label: 'Analitika', icon: BarChart3 },
  { href: '/users', label: 'Müştərilər', icon: Users },
  { href: '/providers', label: 'Xidmət verənlər', icon: ShieldCheck },
  { href: '/categories', label: 'Kateqoriyalar', icon: FolderTree },
  { href: '/services', label: 'Xidmətlər', icon: Briefcase },
  { href: '/bookings', label: 'Sifarişlər', icon: ClipboardList },
  { href: '/reviews', label: 'Rəylər', icon: Star },
  { href: '/reports', label: 'Şikayətlər', icon: Flag },
  { href: '/contact', label: 'Əlaqə', icon: Inbox },
  { href: '/audit', label: 'Audit', icon: ScrollText },
  { href: '/announcements', label: 'Bildirişlər', icon: Megaphone },
  { href: '/settings', label: 'Tənzimləmələr', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const { counts: attentionCounts, liveMessage } = useAdminNavAttention();

  useScrollLock(mobileOpen);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const closeMobile = () => setMobileOpen(false);

  const activeHref = ADMIN_NAV.reduce<string | null>((best, item) => {
    const matches = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (!matches) return best;
    if (!best || item.href.length > best.length) return item.href;
    return best;
  }, null);

  const userAvatar = (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand/20 text-sm font-semibold text-brand-foreground">
      {user?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt={`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()}
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          {user?.firstName?.[0]}
          {user?.lastName?.[0]}
        </>
      )}
    </div>
  );

  const navContent = (
    <nav className="flex flex-1 flex-col gap-1 p-4" aria-label="Admin naviqasiyası">
      {liveMessage ? (
        <p className="sr-only" aria-live="polite">
          {liveMessage}
        </p>
      ) : null}
      {ADMIN_NAV.map((item) => {
        const Icon = item.icon;
        const active = item.href === activeHref;
        const attention = navAttentionCount(item.href, attentionCounts);
        const attentionLabel = formatNavAttentionAria(item.label, attention);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeMobile}
            aria-label={attentionLabel}
            title={attentionLabel}
            className={cn(
              'flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-brand text-brand-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            <NavAttentionIndicator count={attention} />
          </Link>
        );
      })}
    </nav>
  );

  const userBlock = (
    <div className="border-t border-border p-4">
      <div className="mb-3 flex items-center gap-3 rounded-lg bg-muted px-3 py-3">
        {userAvatar}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-muted-foreground">Administrator</p>
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
        <p className="text-sm font-semibold">İdarə etmə paneli</p>
        <div className="flex items-center gap-1">
          <ThemeToggle variant="switch" />
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md hover:bg-muted"
            aria-expanded={mobileOpen}
            aria-controls="admin-mobile-nav"
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
            id="admin-mobile-nav"
            className="fixed inset-x-0 top-14 z-50 flex max-h-[calc(100dvh-3.5rem)] flex-col overflow-y-auto overscroll-contain border-b border-border bg-card shadow-lg lg:hidden"
          >
            {navContent}
            {userBlock}
          </div>
        </>
      )}

      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-border bg-card lg:flex lg:h-[100dvh] lg:overflow-hidden">
        <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-4">
          <p className="truncate text-sm font-semibold">İdarə etmə paneli</p>
          <ThemeToggle variant="switch" />
        </div>
        {navContent}
        <div className="mt-auto">{userBlock}</div>
      </aside>
    </>
  );
}
