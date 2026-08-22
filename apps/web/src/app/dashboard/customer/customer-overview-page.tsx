'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, MessageSquare, Search, ArrowRight } from 'lucide-react';
import { BookingStatus, ACTIVE_BOOKING_STATUSES } from '@xidmetal/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonStyles } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useAuthStore } from '@/store/auth.store';
import { formatPrice } from '@/lib/utils';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_VARIANTS } from '@/lib/provider-labels';
import { DASHBOARD_LIST_POLL_MS } from '@/lib/live-attention';

export function CustomerOverviewPage() {
  const token = useAuthToken();
  const user = useAuthStore((state) => state.user);

  const { data: bookings } = useQuery({
    queryKey: ['bookings', 'all'],
    queryFn: () => api.bookings(token!, { limit: '100' }),
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

  const activeSet = new Set<string>(ACTIVE_BOOKING_STATUSES);
  const activeBookings =
    bookings?.items.filter((b) => activeSet.has(b.status)).length ?? 0;

  const completedBookings =
    bookings?.items.filter((b) => b.status === BookingStatus.COMPLETED).length ?? 0;

  const unreadMessages =
    conversations?.items.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;

  const stats = [
    {
      label: 'Aktiv sifarişlər',
      value: activeBookings,
      icon: ClipboardList,
      href: '/dashboard/customer/bookings',
    },
    {
      label: 'Tamamlanan sifarişlər',
      value: completedBookings,
      icon: ClipboardList,
      href: '/dashboard/customer/bookings',
    },
    {
      label: 'Oxunmamış mesaj',
      value: unreadMessages,
      icon: MessageSquare,
      href: '/dashboard/customer/messages',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Salam, {user?.firstName}!
          </h1>
          <p className="mt-1 text-muted-foreground">
            Sifarişlərinizi izləyin, xidmət verənlərlə yazışın və profilinizi idarə edin.
          </p>
        </div>
        <Link href="/" className={buttonStyles()}>
          <Search className="h-4 w-4" />
          Xidmət tap
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="transition-colors hover:border-brand/50">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/15">
                    <Icon className="h-5 w-5 text-brand-dark" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Son sifarişlər</CardTitle>
              <CardDescription>Ən son verdiyiniz sifarişlər</CardDescription>
            </div>
            <Link href="/dashboard/customer/bookings" className={buttonStyles('ghost', 'sm')}>
              Hamısı
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {bookings?.items.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">Hələ sifariş yoxdur</p>
                <Link href="/" className={buttonStyles('default', 'sm') + ' mt-3'}>
                  Xidmət tap
                </Link>
              </div>
            )}
            <ul className="divide-y divide-border">
              {bookings?.items.slice(0, 5).map((booking) => (
                <li key={booking.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{booking.serviceTitle}</p>
                    <p className="text-xs text-muted-foreground">{booking.providerName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={BOOKING_STATUS_VARIANTS[booking.status]} className="text-xs">
                      {BOOKING_STATUS_LABELS[booking.status]}
                    </Badge>
                    <p className="text-sm font-medium">{formatPrice(booking.totalPrice)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Son mesajlar</CardTitle>
              <CardDescription>Xidmət verənlərlə yazışmalar</CardDescription>
            </div>
            <Link href="/dashboard/customer/messages" className={buttonStyles('ghost', 'sm')}>
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
                    href={`/dashboard/customer/messages?conversationId=${conv.id}`}
                    className="flex min-h-[44px] items-center justify-between gap-3 py-3 transition-colors hover:text-foreground"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{conv.providerName}</p>
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
    </div>
  );
}
