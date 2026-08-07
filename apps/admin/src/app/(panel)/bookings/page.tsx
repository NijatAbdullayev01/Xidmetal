'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookingStatus, BookingType } from '@xidmetal/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { formatPrice } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: 'Bütün statuslar' },
  { value: BookingStatus.PENDING, label: 'Gözləyir' },
  { value: BookingStatus.CONFIRMED, label: 'Təsdiqlənib' },
  { value: BookingStatus.EN_ROUTE, label: 'Yoldadır' },
  { value: BookingStatus.ARRIVED, label: 'Ünvanda' },
  { value: BookingStatus.IN_PROGRESS, label: 'Davam edir' },
  { value: BookingStatus.COMPLETED, label: 'Tamamlanıb' },
  { value: BookingStatus.CANCELLED, label: 'Ləğv edilib' },
  { value: BookingStatus.REJECTED, label: 'Rədd edilib' },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Gözləyir',
  CONFIRMED: 'Təsdiqlənib',
  EN_ROUTE: 'Yoldadır',
  ARRIVED: 'Ünvanda',
  IN_PROGRESS: 'Davam edir',
  COMPLETED: 'Tamamlanıb',
  CANCELLED: 'Ləğv edilib',
  REJECTED: 'Rədd edilib',
};

const STATUS_BADGE: Record<string, 'muted' | 'success' | 'warning' | 'destructive' | 'default'> = {
  PENDING: 'warning',
  CONFIRMED: 'default',
  EN_ROUTE: 'default',
  ARRIVED: 'default',
  IN_PROGRESS: 'default',
  COMPLETED: 'success',
  CANCELLED: 'muted',
  REJECTED: 'destructive',
};

const TYPE_LABEL: Record<string, string> = {
  [BookingType.SCHEDULED]: 'Planlaşdırılmış',
  [BookingType.INSTANT]: 'Təcili',
};

/** Admin UI: məntiqli növbəti addımlar (API bypass istənilən keçidə icazə verir) */
const ADMIN_NEXT_STATUSES: Partial<Record<BookingStatus, BookingStatus[]>> = {
  [BookingStatus.PENDING]: [
    BookingStatus.CONFIRMED,
    BookingStatus.REJECTED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.CONFIRMED]: [BookingStatus.EN_ROUTE, BookingStatus.CANCELLED],
  [BookingStatus.EN_ROUTE]: [BookingStatus.ARRIVED, BookingStatus.CANCELLED],
  [BookingStatus.ARRIVED]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
  [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
};

export default function AdminBookingsPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const params: Record<string, string> = { page: String(page), limit: '20' };
  if (status) params.status = status;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'bookings', params],
    queryFn: () => api.admin.bookings(token!, params),
    enabled: !!token,
  });

  const updateStatus = useMutation({
    mutationFn: ({
      id,
      next,
      reason,
    }: {
      id: string;
      next: BookingStatus;
      reason?: string;
    }) => api.updateBookingStatus(token!, id, next, { cancelReason: reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      setError(null);
      setCancelTarget(null);
      setCancelReason('');
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Status yenilənmədi');
    },
  });

  const handleNext = (id: string, title: string, next: BookingStatus) => {
    if (next === BookingStatus.CANCELLED) {
      setCancelTarget({ id, title });
      setCancelReason('');
      return;
    }
    updateStatus.mutate({ id, next });
  };

  const confirmCancel = () => {
    if (!cancelTarget) return;
    const reason = cancelReason.trim();
    if (reason.length < 3) {
      setError('Ləğv səbəbi tələb olunur (minimum 3 simvol)');
      return;
    }
    updateStatus.mutate({
      id: cancelTarget.id,
      next: BookingStatus.CANCELLED,
      reason,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sifarişlər</h1>
        <p className="mt-1 text-muted-foreground">
          Bütün sifarişləri izləyin və lazım gələrsə statusu dəyişin.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="max-w-xs">
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
            const nextStatuses = ADMIN_NEXT_STATUSES[booking.status as BookingStatus] ?? [];
            return (
              <Card key={booking.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{booking.serviceTitle}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {booking.customerName} → {booking.providerName}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={STATUS_BADGE[booking.status] ?? 'muted'}>
                        {STATUS_LABEL[booking.status] ?? booking.status}
                      </Badge>
                      {'type' in booking && booking.type ? (
                        <Badge variant="muted">
                          {TYPE_LABEL[String(booking.type)] ?? String(booking.type)}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>
                      Tarix:{' '}
                      {new Date(booking.scheduledAt).toLocaleString('az-AZ', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                    <span>Qiymət: {formatPrice(booking.totalPrice)}</span>
                  </div>
                  {nextStatuses.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {nextStatuses.map((next) => (
                        <Button
                          key={next}
                          size="sm"
                          variant={
                            next === BookingStatus.CANCELLED || next === BookingStatus.REJECTED
                              ? 'destructive'
                              : 'outline'
                          }
                          disabled={updateStatus.isPending}
                          onClick={() =>
                            handleNext(booking.id, booking.serviceTitle, next)
                          }
                        >
                          {STATUS_LABEL[next] ?? next}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
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

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-base">Sifarişi ləğv et</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{cancelTarget.title}</p>
              <div className="space-y-2">
                <Label htmlFor="admin-cancel-reason">Səbəb</Label>
                <Textarea
                  id="admin-cancel-reason"
                  rows={3}
                  placeholder="Admin ləğv səbəbi…"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={updateStatus.isPending}
                  onClick={confirmCancel}
                >
                  Ləğv et
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updateStatus.isPending}
                  onClick={() => setCancelTarget(null)}
                >
                  Bağla
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
