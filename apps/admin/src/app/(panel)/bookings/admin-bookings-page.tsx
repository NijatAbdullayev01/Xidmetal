'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookingStatus, BookingType, formatBookingDateTime } from '@xidmetal/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { BookingOrderNumber } from '@/components/booking-order-number';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { formatPrice } from '@/lib/utils';
import { adminListQueryOptions } from '@/lib/admin-queries';

const STATUS_OPTIONS = [
  { value: '', label: 'Bütün statuslar' },
  { value: BookingStatus.PENDING, label: 'Gözləyir' },
  { value: BookingStatus.CONFIRMED, label: 'Təsdiqlənib' },
  { value: BookingStatus.EN_ROUTE, label: 'Yoldadır' },
  { value: BookingStatus.ARRIVED, label: 'Ünvanda' },
  { value: BookingStatus.IN_PROGRESS, label: 'Davam edir' },
  { value: BookingStatus.COMPLETED, label: 'Tamamlanıb' },
  { value: BookingStatus.CANCELLED, label: 'Ləğv edilib' },
  { value: BookingStatus.REJECTED, label: 'İmtina edilib' },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Gözləyir',
  CONFIRMED: 'Təsdiqlənib',
  EN_ROUTE: 'Yoldadır',
  ARRIVED: 'Ünvanda',
  IN_PROGRESS: 'Davam edir',
  COMPLETED: 'Tamamlanıb',
  CANCELLED: 'Ləğv edilib',
  REJECTED: 'İmtina edilib',
};

const STATUS_BADGE: Record<
  string,
  'muted' | 'success' | 'warning' | 'destructive' | 'default' | 'info' | 'transit' | 'arrived' | 'progress'
> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  EN_ROUTE: 'transit',
  ARRIVED: 'arrived',
  IN_PROGRESS: 'progress',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
  REJECTED: 'destructive',
};

const TYPE_LABEL: Record<string, string> = {
  [BookingType.SCHEDULED]: 'Planlaşdırılmış',
  [BookingType.INSTANT]: 'Təcili',
};

export function AdminBookingsPage() {
  const token = useAuthToken();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const params: Record<string, string> = { page: String(page), limit: '20' };
  if (status) params.status = status;
  if (search.trim()) params.search = search.trim();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'bookings', params],
    queryFn: () => api.admin.bookings(token!, params),
    enabled: !!token,
    ...adminListQueryOptions,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sifarişlər</h1>
        <p className="mt-1 text-muted-foreground">
          Bütün sifarişləri izləyin. Statusu yalnız xidmət alan və xidmət verən dəyişə bilər.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:max-w-xl">
        <div>
          <Label htmlFor="booking-search">Sifariş nömrəsi</Label>
          <Input
            id="booking-search"
            className="mt-1.5"
            placeholder="XM-26-000421"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div>
          <Label htmlFor="booking-status">Status filteri</Label>
          <Select
            id="booking-status"
            className="mt-1.5"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={STATUS_OPTIONS}
            placeholder="Status"
          />
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Yüklənir…</p>}

      {!isLoading && data && (
        <div className="grid gap-4">
          {data.items.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Sifariş tapılmadı
              </CardContent>
            </Card>
          )}
          {data.items.map((booking) => {
            const showCancelReason =
              Boolean(booking.cancelReason) &&
              (booking.status === BookingStatus.CANCELLED ||
                booking.status === BookingStatus.REJECTED);
            return (
              <Card key={booking.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{booking.serviceTitle}</CardTitle>
                      <div className="mt-1.5 space-y-1 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-foreground">Xidmət alan:</span>
                          <span className="text-muted-foreground">{booking.customerName}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-foreground">Xidmət verən:</span>
                          <span className="text-muted-foreground">{booking.providerName}</span>
                        </div>
                        <BookingOrderNumber value={booking.orderNumber} />
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-foreground">Tarix və saat:</span>
                          <span className="text-muted-foreground">
                            {formatBookingDateTime(booking)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-foreground">Qiymət:</span>
                          <span className="text-muted-foreground">
                            {formatPrice(booking.totalPrice)}
                          </span>
                        </div>
                        {showCancelReason && (
                          <div className="flex items-start gap-2">
                            <span className="shrink-0 text-foreground">Səbəb:</span>
                            <span className="min-w-0 flex-1 break-words text-muted-foreground">
                              {booking.cancelReason}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={STATUS_BADGE[booking.status] ?? 'muted'}>
                        {STATUS_LABEL[booking.status] ?? booking.status}
                      </Badge>
                      {'type' in booking && booking.type ? (
                        <Badge
                          variant={
                            booking.type === BookingType.INSTANT ? 'brand' : 'muted'
                          }
                        >
                          {TYPE_LABEL[String(booking.type)] ?? String(booking.type)}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Əvvəlki
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Növbəti
          </Button>
        </div>
      )}
    </div>
  );
}
