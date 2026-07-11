'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { BookingStatus } from '@xidmetal/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { formatPrice, formatDate } from '@/lib/utils';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_VARIANTS } from '@/lib/provider-labels';
import { cn } from '@/lib/utils';

type TabKey = 'all' | 'pending' | 'active' | 'completed';

const TABS: { key: TabKey; label: string; status?: BookingStatus }[] = [
  { key: 'all', label: 'Hamısı' },
  { key: 'pending', label: 'Gözləyən', status: BookingStatus.PENDING },
  { key: 'active', label: 'Aktiv', status: BookingStatus.IN_PROGRESS },
  { key: 'completed', label: 'Tamamlanan', status: BookingStatus.COMPLETED },
];

export default function ProviderBookingsPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [actionId, setActionId] = useState<string | null>(null);

  const currentTab = TABS.find((t) => t.key === activeTab)!;

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', activeTab],
    queryFn: () =>
      api.bookings(token!, {
        limit: '50',
        ...(currentTab.status && { status: currentTab.status }),
      }),
    enabled: !!token,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) => {
      if (!token) throw new Error('Autentifikasiya tələb olunur');
      return api.updateBookingStatus(token, id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setActionId(null);
    },
  });

  const handleAction = (id: string, status: BookingStatus) => {
    setActionId(id);
    updateMutation.mutate({ id, status });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sifarişlər</h1>
        <p className="mt-1 text-muted-foreground">
          Müştəri sifarişlərini idarə edin — təsdiqləyin, rədd edin və ya tamamlayın.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-brand text-brand-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Bu kateqoriyada sifariş yoxdur
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {data?.items.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{booking.serviceTitle}</h3>
                    <Badge variant={BOOKING_STATUS_VARIANTS[booking.status]}>
                      {BOOKING_STATUS_LABELS[booking.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Müştəri: {booking.customerName}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>Tarix: {formatDate(booking.scheduledAt)}</span>
                    <span>Qiymət: {formatPrice(booking.totalPrice)}</span>
                  </div>
                  {booking.notes && (
                    <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm">
                      {booking.notes}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {booking.status === BookingStatus.PENDING && (
                    <>
                      <Button
                        size="sm"
                        disabled={actionId === booking.id}
                        onClick={() => handleAction(booking.id, BookingStatus.CONFIRMED)}
                      >
                        {actionId === booking.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Təsdiq et'
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={actionId === booking.id}
                        onClick={() => handleAction(booking.id, BookingStatus.REJECTED)}
                      >
                        Rədd et
                      </Button>
                    </>
                  )}
                  {booking.status === BookingStatus.CONFIRMED && (
                    <Button
                      size="sm"
                      disabled={actionId === booking.id}
                      onClick={() => handleAction(booking.id, BookingStatus.IN_PROGRESS)}
                    >
                      İcraya başla
                    </Button>
                  )}
                  {booking.status === BookingStatus.IN_PROGRESS && (
                    <Button
                      size="sm"
                      disabled={actionId === booking.id}
                      onClick={() => handleAction(booking.id, BookingStatus.COMPLETED)}
                    >
                      Tamamla
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
