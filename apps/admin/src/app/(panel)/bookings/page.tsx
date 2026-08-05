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

  const cancel = useMutation({
    mutationFn: (id: string) =>
      api.updateBookingStatus(token!, id, BookingStatus.CANCELLED),
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
            {data?.items.map((booking) => (
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
                {booking.status !== BookingStatus.CANCELLED &&
                  booking.status !== BookingStatus.COMPLETED &&
                  booking.status !== BookingStatus.REJECTED && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[44px] shrink-0"
                      disabled={cancel.isPending}
                      onClick={() => cancel.mutate(booking.id)}
                    >
                      Ləğv et
                    </Button>
                  )}
              </li>
            ))}
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
