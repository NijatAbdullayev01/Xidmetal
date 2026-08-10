'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  Briefcase,
  ClipboardList,
  CalendarDays,
  MessageSquare,
  Bell,
  Star,
  Settings,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  Search,
  Flag,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { UserRole } from '@xidmetal/shared';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/use-logout';
import { useMessageNotifications } from '@/hooks/use-message-notifications';
import { useBookingNotifications } from '@/hooks/use-booking-notifications';
import { useReviewNotifications } from '@/hooks/use-review-notifications';
import { cn } from '@/lib/utils';
import { useScrollLock } from '@/hooks/use-scroll-lock';

type DashboardVariant = 'provider' | 'customer';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const PROVIDER_NAV: NavItem[] = [
  { href: '/dashboard/provider', label: 'İcmal', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/provider/services/new', label: 'Xidmət ver', icon: PlusCircle },
  { href: '/dashboard/provider/services', label: 'Xidmətlərim', icon: Briefcase },
  { href: '/dashboard/provider/calendar', label: 'Təqvim', icon: CalendarDays },
  { href: '/dashboard/provider/bookings', label: 'Sifarişlər', icon: ClipboardList },
  { href: '/dashboard/provider/messages', label: 'Mesajlarım', icon: MessageSquare },
  { href: '/dashboard/provider/notifications', label: 'Bildirişlər', icon: Bell },
  { href: '/dashboard/provider/ratings', label: 'Reytinq', icon: Star },
  { href: '/dashboard/provider/settings', label: 'Tənzimləmələr', icon: Settings },
];

const CUSTOMER_NAV: NavItem[] = [
  { href: '/dashboard/customer', label: 'İcmal', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/customer/bookings', label: 'Sifarişlərim', icon: ClipboardList },
  { href: '/dashboard/customer/messages', label: 'Mesajlarım', icon: MessageSquare },
  { href: '/dashboard/customer/notifications', label: 'Bildirişlər', icon: Bell },
  { href: '/', label: 'Xidmət tap', icon: Search },
  { href: '/dashboard/customer/report', label: 'Şikayət', icon: Flag },
  { href: '/dashboard/customer/settings', label: 'Tənzimləmələr', icon: Settings },
];

const ROLE_LABELS: Record<DashboardVariant, string> = {
  provider: 'Xidmət verən',
  customer: 'Müştəri',
};

interface DashboardSidebarProps {
  variant: DashboardVariant;
}

function isMessagesNavItem(href: string) {
  return href.endsWith('/messages');
}

function isBookingsNavItem(href: string) {
  return href.endsWith('/bookings');
}

function isRatingsNavItem(href: string) {
  return href.endsWith('/ratings');
}

function NavBadge({
  count,
  active,
  label,
}: {
  count: number;
  active: boolean;
  label: string;
}) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        'ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
        active
          ? 'bg-brand-foreground/15 text-brand-foreground'
          : 'bg-brand text-brand-foreground',
      )}
      aria-label={label}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function DashboardSidebar({ variant }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileHeaderRef = useRef<HTMLDivElement>(null);
  const [mobilePanelTop, setMobilePanelTop] = useState(56);
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const { unreadCount: unreadMessages } = useMessageNotifications(!!user);
  const { attentionCount: bookingAttention } = useBookingNotifications(!!user);
  const { attentionCount: reviewAttention } = useReviewNotifications(
    !!user && variant === 'provider',
  );

  const navItems = variant === 'provider' ? PROVIDER_NAV : CUSTOMER_NAV;
  const roleLabel = ROLE_LABELS[variant];

  useScrollLock(mobileOpen);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useLayoutEffect(() => {
    const header = mobileHeaderRef.current;
    if (!header) return;

    const syncPanelTop = () => {
      setMobilePanelTop(header.getBoundingClientRect().bottom);
    };

    syncPanelTop();
    const observer = new ResizeObserver(syncPanelTop);
    observer.observe(header);

    // Bildiriş icazəsi banneri header ölçüsünü dəyişmədən onu aşağı itələyə bilər
    let node: HTMLElement | null = header.parentElement;
    while (node && node !== document.body) {
      observer.observe(node);
      node = node.parentElement;
    }

    window.addEventListener('resize', syncPanelTop);
    window.addEventListener('scroll', syncPanelTop, true);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncPanelTop);
      window.removeEventListener('scroll', syncPanelTop, true);
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

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
        const messageBadge = isMessagesNavItem(item.href);
        const bookingBadge = isBookingsNavItem(item.href);
        const ratingsBadge = isRatingsNavItem(item.href);
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
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {messageBadge && (
              <NavBadge
                count={unreadMessages}
                active={active}
                label={`${unreadMessages} oxunmamış mesaj`}
              />
            )}
            {bookingBadge && (
              <NavBadge
                count={bookingAttention}
                active={active}
                label={`${bookingAttention} yeni sifariş bildirişi`}
              />
            )}
            {ratingsBadge && (
              <NavBadge
                count={reviewAttention}
                active={active}
                label={`${reviewAttention} yeni rəy`}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );

  const mobileUserBlock = (
    <div className="border-t border-border px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mb-3 flex items-center gap-3 rounded-lg bg-muted px-3 py-3">
        {userAvatar}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{roleLabel}</p>
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
      <div
        ref={mobileHeaderRef}
        className="sticky top-0 z-40 flex h-14 min-h-[3.5rem] items-center justify-between border-b border-border bg-background px-4 safe-top lg:hidden"
      >
        <Link
          href="/"
          className="flex min-h-[44px] items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="sm:inline">Geri qayıt</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle variant="switch" />
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/80 text-muted-foreground shadow-inner transition-colors hover:bg-muted hover:text-foreground"
            aria-expanded={mobileOpen}
            aria-controls="dashboard-mobile-nav"
            aria-label={mobileOpen ? 'Menyunu bağla' : 'Menyunu aç'}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-x-0 bottom-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
            style={{ top: mobilePanelTop }}
            aria-label="Menyunu bağla"
            onClick={closeMobile}
          />
          <div
            id="dashboard-mobile-nav"
            className="fixed inset-x-0 z-50 flex flex-col overflow-y-auto overscroll-contain border-b border-border bg-card shadow-lg lg:hidden"
            style={{
              top: mobilePanelTop,
              maxHeight: `calc(100dvh - ${mobilePanelTop}px)`,
            }}
          >
            {navContent}
            {mobileUserBlock}
          </div>
        </>
      )}

      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-border bg-card lg:flex lg:overflow-hidden">
        <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-4">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">Geri qayıt</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle variant="switch" />
          </div>
        </div>

        {navContent}

        <div className="mt-auto border-t border-border p-4">
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
            {userAvatar}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
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

export function getDashboardVariant(role: UserRole): DashboardVariant {
  return role === UserRole.PROVIDER ? 'provider' : 'customer';
}
