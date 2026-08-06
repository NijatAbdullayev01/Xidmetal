'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookingStatus } from '@xidmetal/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { formatPrice } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: 'Bütün statuslar' },
  { value: BookingStatus.PENDING, label: 'Gözləyir' },
  { value: BookingStatus.CONFIRMED, label: 'Təsdiqlənib' },
  { value: BookingStatus.IN_PROGRESS, label: 'Davam edir' },
  { value: BookingStatus.COMPLETED, label: 'Tamamlanıb' },
  { value: BookingStatus.CANCELLED, label: 'Ləğv edilib' },
  { value: BookingStatus.REJECTED, label: 'Rədd edilib' },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Gözləyir',
  CONFIRMED: 'Təsdiqlənib',
  IN_PROGRESS: 'Davam edir',
  COMPLETED: 'Tamamlanıb',
  CANCELLED: 'Ləğv edilib',
  REJECTED: 'Rədd edilib',
};

const STATUS_BADGE: Record<string, 'muted' | 'success' | 'warning' | 'destructive' | 'default'> = {
  PENDING: 'warning',
  CONFIRMED: 'default',
  IN_PROGRESS: 'default',
  COMPLETED: 'success',
  CANCELLED: 'muted',
  REJECTED: 'destructive',
};

/** Admin bypass: istənilən statusa keçid (terminal vəziyyətlər istisna) */
const ADMIN_NEXT_STATUSES: Partial<Record<BookingStatus, BookingStatus[]>> = {
  [BookingStatus.PENDING]: [
    BookingStatus.CONFIRMED,
    BookingStatus.REJECTED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.CONFIRMED]: [
    BookingStatus.IN_PROGRESS,
    BookingStatus.CANCELLED,
    BookingStatus.COMPLETED,
  ],
  [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
};

export default function AdminBookingsPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const params: Record<string, string> = { page: String(page), limit: '20' };
  if (status) params.status = status;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'bookings', params],
    queryFn: () => api.admin.bookings(token!, params),
    enabled: !!token,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: BookingStatus }) =>
      api.updateBookingStatus(token!, id, next),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Əməliyyat uğursuz oldu');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sifarişlər</h1>
        <p className="mt-1 text-muted-foreground">
          Bütün platforma sifarişlərini izləyin. Admin istənilən status keçidini edə bilər.
        </p>
      </div>

      <Card>
        <CardHeader className="gap-4 space-y-0">
          <CardTitle className="text-base">Filtr</CardTitle>
          <Select
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={STATUS_OPTIONS}
            placeholder="Status"
            clearable
          />
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">Yüklənir…</p>
          )}
          {!isLoading && data?.items.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Sifariş tapılmadı</p>
          )}

          <ul className="divide-y divide-border">
            {data?.items.map((booking) => {
              const nextStatuses =
                ADMIN_NEXT_STATUSES[booking.status as BookingStatus] ?? [];
              return (
                <li
                  key={booking.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{booking.serviceTitle}</p>
                      <Badge variant={STATUS_BADGE[booking.status] ?? 'muted'}>
                        {STATUS_LABEL[booking.status] ?? booking.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {booking.customerName} → {booking.providerName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(booking.scheduledAt).toLocaleString('az-AZ')} ·{' '}
                      {formatPrice(booking.totalPrice)}
                    </p>
                  </div>
                  {nextStatuses.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {nextStatuses.map((next) => (
                        <Button
                          key={next}
                          variant={next === BookingStatus.CANCELLED || next === BookingStatus.REJECTED ? 'outline' : 'default'}
                          size="sm"
                          className="min-h-[44px] shrink-0"
                          disabled={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: booking.id, next })}
                        >
                          {STATUS_LABEL[next] ?? next}
                        </Button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {data && data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
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
        </CardContent>
      </Card>
    </div>
  );
}
