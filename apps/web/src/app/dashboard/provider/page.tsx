'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, ClipboardList, Star, PlusCircle, ArrowRight, MessageSquare } from 'lucide-react';
import type { ProviderDashboardStats } from '@xidmetal/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonStyles } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { formatPrice } from '@/lib/utils';
import { DispatchOffersCard } from '@/components/dispatch/dispatch-offers-card';
import { ProviderVerificationBanner } from '@/components/provider/provider-verification-banner';
import { DASHBOARD_LIST_POLL_MS } from '@/lib/live-attention';

export default function ProviderOverviewPage() {
  const token = useAuthToken();

  const { data: dashboardStats } = useQuery({
    queryKey: ['users', 'dashboard-stats'],
    queryFn: () => api.users.dashboardStats(token!),
    enabled: !!token,
    refetchInterval: DASHBOARD_LIST_POLL_MS,
    refetchOnWindowFocus: true,
  });

  const { data: services } = useQuery({
    queryKey: ['services', 'mine'],
    queryFn: () => api.myServices(token!, { limit: '10' }),
    enabled: !!token,
  });

  const { data: bookings } = useQuery({
    queryKey: ['bookings', 'recent'],
    queryFn: () => api.bookings(token!, { limit: '10' }),
    enabled: !!token,
    refetchInterval: DASHBOARD_LIST_POLL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.messages.conversations(token!, { limit: '100' }),
    enabled: !!token,
    refetchInterval: DASHBOARD_LIST_POLL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const statsSummary: ProviderDashboardStats = dashboardStats ?? {
    activeServices: 0,
    totalServices: 0,
    pendingBookings: 0,
    completedBookings: 0,
    rating: 0,
    reviewCount: 0,
  };

  const unreadMessages =
    conversations?.items.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;

  const stats = [
    {
      label: 'Aktiv xidmətlər',
      value: statsSummary.activeServices,
      icon: Briefcase,
      href: '/dashboard/provider/services',
    },
    {
      label: 'Gözləyən sifarişlər',
      value: statsSummary.pendingBookings,
      icon: ClipboardList,
      href: '/dashboard/provider/bookings',
    },
    {
      label: 'Oxunmamış mesaj',
      value: unreadMessages,
      icon: MessageSquare,
      href: '/dashboard/provider/messages',
    },
    {
      label: 'Reytinq',
      value:
        statsSummary.reviewCount > 0 ? `${statsSummary.rating.toFixed(1)} ★` : '—',
      icon: Star,
      href: '/dashboard/provider/ratings',
    },
  ];

  return (
    <div className="space-y-8">
      <ProviderVerificationBanner />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Kabinetinizə xoş gəlmisiniz
          </h1>
          <p className="mt-1 text-muted-foreground">
            Xidmətlərinizi, sifarişlərinizi və reytinqinizi bir baxışda izləyin.
          </p>
        </div>
        <Link href="/dashboard/provider/services/new" className={buttonStyles()}>
          <PlusCircle className="h-4 w-4" />
          Yeni xidmət
        </Link>
      </div>

      <div className="@container">
        <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4 @3xl:gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.label} href={stat.href} className="min-w-0">
                <Card className="h-full transition-colors hover:border-brand/50">
                  <CardContent className="flex items-start gap-3 p-4 @xl:items-center @xl:gap-4 @xl:p-5 @3xl:p-6">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 @xl:h-10 @xl:w-10">
                      <Icon className="h-4 w-4 text-brand-dark @xl:h-5 @xl:w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs leading-snug text-muted-foreground @xl:text-sm">
                        {stat.label}
                      </p>
                      <p className="mt-0.5 text-xl font-bold tabular-nums @xl:text-2xl">
                        {stat.value}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <DispatchOffersCard />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Son sifarişlər</CardTitle>
              <CardDescription>
                Ən son daxil olan sifarişlər · {statsSummary.completedBookings} tamamlanmış
              </CardDescription>
            </div>
            <Link
              href="/dashboard/provider/bookings"
              className={buttonStyles('ghost', 'sm')}
            >
              Hamısı
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {bookings?.items.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Hələ sifariş yoxdur
              </p>
            )}
            <ul className="divide-y divide-border">
              {bookings?.items.slice(0, 5).map((booking) => (
                <li key={booking.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{booking.serviceTitle}</p>
                    <p className="text-xs text-muted-foreground">{booking.customerName}</p>
                  </div>
                  <p className="text-sm font-medium">{formatPrice(booking.totalPrice)}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Son mesajlar</CardTitle>
              <CardDescription>Müştərilərlə yazışmalar</CardDescription>
            </div>
            <Link
              href="/dashboard/provider/messages"
              className={buttonStyles('ghost', 'sm')}
            >
              Hamısı
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {conversations?.items.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Hələ mesaj yoxdur
              </p>
            )}
            <ul className="divide-y divide-border">
              {conversations?.items.slice(0, 5).map((conv) => (
                <li key={conv.id}>
                  <Link
                    href={`/dashboard/provider/messages?conversationId=${conv.id}`}
                    className="flex min-h-[44px] items-center justify-between gap-3 py-3 transition-colors hover:text-foreground"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{conv.customerName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {conv.lastMessage ?? 'Yeni söhbət'}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-medium text-brand-foreground">
                        {conv.unreadCount}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Xidmətlərim</CardTitle>
            <CardDescription>
              Yaratdığınız xidmətlər · cəmi {statsSummary.totalServices}
            </CardDescription>
          </div>
          <Link
            href="/dashboard/provider/services"
            className={buttonStyles('ghost', 'sm')}
          >
            Hamısı
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {services?.items.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">Hələ xidmət yoxdur</p>
              <Link
                href="/dashboard/provider/services/new"
                className={buttonStyles('default', 'sm') + ' mt-3'}
              >
                İlk xidməti yarat
              </Link>
            </div>
          )}
          <ul className="divide-y divide-border">
            {services?.items.slice(0, 5).map((service) => (
              <li key={service.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{service.title}</p>
                  <p className="text-xs text-muted-foreground">{service.categoryName}</p>
                </div>
                <p className="text-sm font-medium">{formatPrice(service.price)}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
