'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Briefcase,
  ClipboardList,
  Star,
  ShieldCheck,
  Flag,
  FolderTree,
  ArrowRight,
  UserCog,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonStyles } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ADMIN_LIST_POLL_MS } from '@/lib/admin-queries';

interface StatCard {
  label: string;
  value: number | string;
  /** Yalnız əsas rəqəmdən fərqli, əlavə kontekst verdikdə */
  hint?: string;
  icon: LucideIcon;
  href: string;
}

function StatsGrid({
  cards,
  isLoading,
}: {
  cards: StatCard[];
  isLoading: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link key={card.label} href={card.href}>
            <Card className="h-full transition-colors hover:border-brand/50">
              <CardContent className="flex items-start gap-4 p-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/15">
                  <Icon className="h-5 w-5 text-brand-dark" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {isLoading ? '…' : card.value}
                  </p>
                  {card.hint && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{card.hint}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export function AdminOverviewPage() {
  const token = useAuthToken();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.admin.stats(token!),
    enabled: !!token,
    refetchInterval: ADMIN_LIST_POLL_MS,
  });

  const inactiveServices =
    stats != null ? stats.servicesTotal - stats.servicesActive : 0;

  /** Moderasiya / növbə — yalnız diqqət tələb edən saylar */
  const attentionCards: StatCard[] = [
    {
      label: 'Təsdiqlənməmiş xidmət verən',
      value: stats?.providersUnverified ?? '—',
      icon: ShieldCheck,
      href: '/providers',
    },
    {
      label: 'Yoxlama gözləyən xidmət',
      value: stats?.servicesPendingReview ?? '—',
      icon: Briefcase,
      href: '/services',
    },
    {
      label: 'Gözləyən sifarişlər',
      value: stats?.bookingsPending ?? '—',
      icon: ClipboardList,
      href: '/bookings',
    },
    {
      label: 'Moderasiya gözləyən rəy',
      value: stats?.reviewsPending ?? '—',
      icon: Star,
      href: '/reviews',
    },
    {
      label: 'Gözləyən şikayət',
      value: stats?.reportsPending ?? '—',
      icon: Flag,
      href: '/reports',
    },
  ];

  /** Platforma icmalı — hər kart bir entity, qarışıq «cəmi» yox */
  const overviewCards: StatCard[] = [
    {
      label: 'Müştərilər',
      value: stats?.usersCustomers ?? '—',
      icon: Users,
      href: '/users',
    },
    {
      label: 'Xidmət verənlər',
      value: stats?.usersProviders ?? '—',
      icon: UserCog,
      href: '/providers',
    },
    {
      label: 'Aktiv xidmətlər',
      value: stats?.servicesActive ?? '—',
      hint:
        stats != null && inactiveServices > 0
          ? `${inactiveServices} qeyri-aktiv`
          : undefined,
      icon: Briefcase,
      href: '/services',
    },
    {
      label: 'Sifarişlər',
      value: stats?.bookingsTotal ?? '—',
      icon: ClipboardList,
      href: '/bookings',
    },
    {
      label: 'Aktiv kateqoriya',
      value: stats?.categoriesActive ?? '—',
      icon: FolderTree,
      href: '/categories',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">İcmal</h1>
        <p className="mt-1 text-muted-foreground">
          Platformanın ümumi vəziyyəti, moderasiya və idarəetmə.
        </p>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Diqqət tələb edir</h2>
          <p className="text-xs text-muted-foreground">
            Təsdiq və ya moderasiya gözləyən işlər
          </p>
        </div>
        <StatsGrid cards={attentionCards} isLoading={isLoading} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Platforma</h2>
          <p className="text-xs text-muted-foreground">Hesablar, xidmətlər və sifarişlər</p>
        </div>
        <StatsGrid cards={overviewCards} isLoading={isLoading} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sürətli əməliyyatlar</CardTitle>
            <CardDescription>Tez-tez istifadə olunan idarəetmə səhifələri</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {[
              { href: '/providers', label: 'Xidmət verən təsdiqi' },
              { href: '/reviews', label: 'Rəy moderasiyası' },
              { href: '/categories', label: 'Kateqoriya idarəsi' },
              { href: '/announcements', label: 'Platforma bildirişi' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={buttonStyles('outline') + ' min-h-[44px] justify-between'}
              >
                {item.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Qeyd</CardTitle>
            <CardDescription>Admin hesabı qeydiyyatla yaradıla bilməz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Yeni admin yalnız seed (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) və ya birbaşa
              verilənlər bazası vasitəsilə əlavə olunur.
            </p>
            <p>
              Müştərini deaktiv etmək aktiv sessiyaları ləğv edir. Xidmət verən
              təsdiqi etibar nişanıdır; rəylər təsdiqlənənə qədər ictimai siyahıda
              görünmür.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
