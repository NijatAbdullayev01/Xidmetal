'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageSquare, CalendarClock } from 'lucide-react';
import { BookingStatus } from '@xidmetal/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_VARIANTS } from '@/lib/provider-labels';
import { cn } from '@/lib/utils';

type TabKey = 'all' | 'pending' | 'active' | 'completed' | 'cancelled';

const TABS: { key: TabKey; label: string; status?: BookingStatus }[] = [
  { key: 'all', label: 'Hamısı' },
  { key: 'pending', label: 'Gözləyən', status: BookingStatus.PENDING },
  { key: 'active', label: 'Aktiv', status: BookingStatus.IN_PROGRESS },
  { key: 'completed', label: 'Tamamlanan', status: BookingStatus.COMPLETED },
  { key: 'cancelled', label: 'Ləğv edilmiş', status: BookingStatus.CANCELLED },
];

export default function CustomerBookingsPage() {
  const token = useAuthToken();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [messageLoadingId, setMessageLoadingId] = useState<string | null>(null);

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
      setActionError(null);
    },
    onError: (error) => {
      setActionId(null);
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else {
        setActionError('Sifariş yenilənərkən xəta baş verdi');
      }
    },
  });

  const startConversationMutation = useMutation({
    mutationFn: (bookingId: string) => {
      if (!token) throw new Error('Autentifikasiya tələb olunur');
      return api.messages.createConversation(token, { bookingId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setMessageLoadingId(null);
      router.push('/dashboard/customer/messages');
    },
    onError: (error) => {
      setMessageLoadingId(null);
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else {
        setActionError('Söhbət açılarkən xəta baş verdi');
      }
    },
  });

  const rejectRescheduleMutation = useMutation({
    mutationFn: (id: string) => {
      if (!token) throw new Error('Autentifikasiya tələb olunur');
      return api.rejectReschedule(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setActionId(null);
      setActionError(null);
    },
    onError: (error) => {
      setActionId(null);
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else {
        setActionError('Tarix təklifi rədd edilərkən xəta baş verdi');
      }
    },
  });

  const confirmRescheduleMutation = useMutation({
    mutationFn: (id: string) => {
      if (!token) throw new Error('Autentifikasiya tələb olunur');
      return api.confirmReschedule(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setActionId(null);
      setActionError(null);
    },
    onError: (error) => {
      setActionId(null);
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else {
        setActionError('Tarix təklifi təsdiqlənərkən xəta baş verdi');
      }
    },
  });

  const handleCancel = (id: string) => {
    setActionError(null);
    setActionId(id);
    updateMutation.mutate({ id, status: BookingStatus.CANCELLED });
  };

  const handleConfirmReschedule = (id: string) => {
    setActionError(null);
    setActionId(id);
    confirmRescheduleMutation.mutate(id);
  };

  const handleRejectReschedule = (id: string) => {
    setActionError(null);
    setActionId(id);
    rejectRescheduleMutation.mutate(id);
  };

  const handleMessage = (bookingId: string) => {
    setActionError(null);
    setMessageLoadingId(bookingId);
    startConversationMutation.mutate(bookingId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sifarişlərim</h1>
        <p className="mt-1 text-muted-foreground">
          Verdiyiniz sifarişləri izləyin, ləğv edin və ya xidmət verənlə əlaqə saxlayın.
        </p>
      </div>

      {actionError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

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
                    Xidmət verən: {booking.providerName}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>Tarix: {formatDateTime(booking.scheduledAt)}</span>
                    <span>Qiymət: {formatPrice(booking.totalPrice)}</span>
                  </div>
                  {booking.proposedScheduledAt && booking.status === BookingStatus.PENDING && (
                    <div className="mt-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 dark:border-amber-700/50 dark:bg-amber-950/30">
                      <div className="flex items-start gap-2">
                        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                            Xidmət verən yeni tarix təklif edib
                          </p>
                          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                            Təklif olunan tarix:{' '}
                            <strong>{formatDateTime(booking.proposedScheduledAt)}</strong>
                          </p>
                          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                            Mesajı oxumaq üçün «Mesaj yaz» düyməsindən istifadə edin.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {booking.notes && (
                    <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm">{booking.notes}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {booking.proposedScheduledAt && booking.status === BookingStatus.PENDING && (
                    <>
                      <Button
                        size="sm"
                        disabled={actionId === booking.id}
                        onClick={() => handleConfirmReschedule(booking.id)}
                      >
                        {actionId === booking.id && confirmRescheduleMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Yeni tarixi təsdiq et'
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionId === booking.id}
                        onClick={() => handleRejectReschedule(booking.id)}
                      >
                        {actionId === booking.id && rejectRescheduleMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Təklifi rədd et'
                        )}
                      </Button>
                    </>
                  )}
                  {(booking.status === BookingStatus.PENDING ||
                    booking.status === BookingStatus.CONFIRMED) && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={actionId === booking.id}
                      onClick={() => handleCancel(booking.id)}
                    >
                      {actionId === booking.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Ləğv et'
                      )}
                    </Button>
                  )}
                  <Button
                      size="sm"
                      variant="outline"
                      disabled={messageLoadingId === booking.id}
                      onClick={() => handleMessage(booking.id)}
                    >
                      {messageLoadingId === booking.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <MessageSquare className="h-4 w-4" />
                          Mesaj yaz
                        </>
                      )}
                    </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
