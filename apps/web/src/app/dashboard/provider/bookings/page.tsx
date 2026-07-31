'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Loader2, MessageSquare } from 'lucide-react';
import { BookingStatus } from '@xidmetal/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useAuthStore } from '@/store/auth.store';
import { combineDateAndTime, formatDateTime, formatPrice } from '@/lib/utils';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_VARIANTS } from '@/lib/provider-labels';
import { cn } from '@/lib/utils';

type TabKey = 'all' | 'pending' | 'active' | 'completed';
type ViewKey = 'incoming' | 'sent';

const TABS: { key: TabKey; label: string; status?: BookingStatus }[] = [
  { key: 'all', label: 'Hamısı' },
  { key: 'pending', label: 'Gözləyən', status: BookingStatus.PENDING },
  { key: 'active', label: 'Aktiv', status: BookingStatus.IN_PROGRESS },
  { key: 'completed', label: 'Tamamlanan', status: BookingStatus.COMPLETED },
];

function RescheduleForm({
  bookingId,
  onCancel,
  onSuccess,
}: {
  bookingId: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const token = useAuthToken();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().slice(0, 10);

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('10:00');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Autentifikasiya tələb olunur');
      const trimmedMessage = message.trim();
      if (!trimmedMessage) {
        throw new Error('Müştəriyə mesaj yazmaq mütləqdir');
      }
      const scheduledAt = combineDateAndTime(date, time);
      if (new Date(scheduledAt) <= new Date()) {
        throw new Error('Yeni tarix gələcəkdə olmalıdır');
      }
      return api.rescheduleBooking(token, bookingId, {
        scheduledAt,
        message: trimmedMessage,
      });
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Tarix yenilənərkən xəta baş verdi');
      }
    },
  });

  return (
    <div className="mt-4 rounded-xl border border-border/70 bg-muted/30 p-4">
      <p className="text-sm font-medium">Yeni tarix təklif et</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`reschedule-date-${bookingId}`}>Tarix</Label>
          <Input
            id={`reschedule-date-${bookingId}`}
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            disabled={mutation.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`reschedule-time-${bookingId}`}>Saat</Label>
          <Input
            id={`reschedule-time-${bookingId}`}
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            disabled={mutation.isPending}
          />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <Label htmlFor={`reschedule-message-${bookingId}`}>Müştəriyə mesaj</Label>
        <Textarea
          id={`reschedule-message-${bookingId}`}
          rows={2}
          placeholder="Yeni tarixi izah edin"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={mutation.isPending}
          required
        />
      </div>
      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={mutation.isPending || !message.trim()}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Tarixi göndər'
          )}
        </Button>
        <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={onCancel}>
          Ləğv et
        </Button>
      </div>
    </div>
  );
}

export default function ProviderBookingsPage() {
  const token = useAuthToken();
  const userId = useAuthStore((state) => state.user?.id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [view, setView] = useState<ViewKey>(
    searchParams.get('view') === 'sent' ? 'sent' : 'incoming',
  );
  const [actionId, setActionId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [messageLoadingId, setMessageLoadingId] = useState<string | null>(null);

  const currentTab = TABS.find((t) => t.key === activeTab)!;

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', 'provider', view, activeTab],
    queryFn: () =>
      api.bookings(token!, {
        limit: '50',
        ...(currentTab.status && { status: currentTab.status }),
      }),
    enabled: !!token,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  const visibleBookings =
    data?.items.filter((booking) =>
      view === 'incoming' ? booking.providerId === userId : booking.customerId === userId,
    ) ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) => {
      if (!token) throw new Error('Autentifikasiya tələb olunur');
      return api.updateBookingStatus(token, id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setActionId(null);
      setRescheduleId(null);
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
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setMessageLoadingId(null);
      router.push(`/dashboard/provider/messages?conversationId=${conversation.id}`);
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

  const handleAction = (id: string, status: BookingStatus) => {
    setActionError(null);
    setRescheduleId(null);
    setActionId(id);
    updateMutation.mutate({ id, status });
  };

  const handleMessage = (bookingId: string) => {
    setActionError(null);
    setMessageLoadingId(bookingId);
    startConversationMutation.mutate(bookingId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sifarişlər</h1>
        <p className="mt-1 text-muted-foreground">
          Müştəri sifarişlərini idarə edin — dərhal təsdiqləyin, rədd edin və ya yeni tarix təklif edin.
        </p>
      </div>

      {actionError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setView('incoming')}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            view === 'incoming'
              ? 'bg-brand text-brand-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground',
          )}
        >
          Gələn sifarişlər
        </button>
        <button
          type="button"
          onClick={() => setView('sent')}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            view === 'sent'
              ? 'bg-brand text-brand-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground',
          )}
        >
          Verdiyim sifarişlər
        </button>
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

      {!isLoading && visibleBookings.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Bu kateqoriyada sifariş yoxdur
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {visibleBookings.map((booking) => (
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
                    {view === 'incoming'
                      ? `Müştəri: ${booking.customerName}`
                      : `Xidmət verən: ${booking.providerName}`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>Tarix: {formatDateTime(booking.scheduledAt)}</span>
                    {booking.proposedScheduledAt && (
                      <span className="text-amber-700 dark:text-amber-400">
                        Təklif olunan tarix: {formatDateTime(booking.proposedScheduledAt)} (müştəri təsdiqi gözlənilir)
                      </span>
                    )}
                    <span>Qiymət: {formatPrice(booking.totalPrice)}</span>
                  </div>
                  {booking.notes && (
                    <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm">
                      {booking.notes}
                    </p>
                  )}
                  {booking.imageUrl && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                        İşin şəkli
                      </p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={booking.imageUrl}
                        alt="Görüləcək işin şəkli"
                        className="max-h-48 max-w-full rounded-xl border border-border object-contain"
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {view === 'incoming' && booking.status === BookingStatus.PENDING && (
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
                        variant="outline"
                        disabled={actionId === booking.id || !!booking.proposedScheduledAt}
                        onClick={() =>
                          setRescheduleId((current: string | null) =>
                            current === booking.id ? null : booking.id,
                          )
                        }
                      >
                        <CalendarClock className="h-4 w-4" />
                        Başqa tarix
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
                  {view === 'incoming' && booking.status === BookingStatus.CONFIRMED && (
                    <Button
                      size="sm"
                      disabled={actionId === booking.id}
                      onClick={() => handleAction(booking.id, BookingStatus.IN_PROGRESS)}
                    >
                      İcraya başla
                    </Button>
                  )}
                  {view === 'incoming' && booking.status === BookingStatus.IN_PROGRESS && (
                    <Button
                      size="sm"
                      disabled={actionId === booking.id}
                      onClick={() => handleAction(booking.id, BookingStatus.COMPLETED)}
                    >
                      Tamamla
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

              {view === 'incoming' && rescheduleId === booking.id && (
                <RescheduleForm
                  bookingId={booking.id}
                  onCancel={() => setRescheduleId(null)}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['bookings'] });
                    setRescheduleId(null);
                    setActionError(null);
                  }}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
