'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Loader2 } from 'lucide-react';
import {
  BookingStatus,
  BookingType,
  toDisplayMediaUrl,
  formatBookingDateTime,
} from '@xidmetal/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useAckBookingNotifications } from '@/hooks/use-ack-booking-notifications';
import { BOOKING_ATTENTION_QUERY_KEY } from '@/hooks/use-booking-notifications';
import { useDispatchOffers } from '@/hooks/use-dispatch-offers';
import { combineDateAndTime, formatDateTime, cn } from '@/lib/utils';
import { BOOKING_TYPE_LABELS } from '@/lib/provider-labels';
import { BookingAddressBlock } from '@/components/bookings/booking-address-block';
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge';
import { CancelBookingDialog } from '@/components/bookings/cancel-booking-dialog';
import { BookingOrderNumber } from '@/components/bookings/booking-order-number';
import {
  BookingCardActions,
  BookingMessageButton,
} from '@/components/bookings/booking-message-button';
import {
  BookingStatusFilters,
  buildBookingStatusTabs,
  getBookingListQueryParams,
  type BookingStatusTabKey,
} from '@/components/bookings/booking-status-filters';
import { ProviderAvailabilityCard } from '@/components/provider/provider-availability-card';
import { useBookingsRealtimeInvalidation } from '@/hooks/use-booking-tracking';

const TABS = buildBookingStatusTabs('Ləğv / imtina');

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

export function ProviderBookingsPage() {
  const token = useAuthToken();
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const queryClient = useQueryClient();
  useAckBookingNotifications(!!token);
  useBookingsRealtimeInvalidation(!!token);
  const {
    accept: acceptDispatchOffer,
    reject: rejectDispatchOffer,
    acceptingId: acceptingOfferId,
    rejectingId: rejectingOfferId,
    acceptError: dispatchAcceptError,
  } = useDispatchOffers(!!token);
  const [activeTab, setActiveTab] = useState<BookingStatusTabKey>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderNumberSearch, setOrderNumberSearch] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [messageLoadingId, setMessageLoadingId] = useState<string | null>(null);
  const [cancelBooking, setCancelBooking] = useState<{
    id: string;
    serviceTitle: string;
    status: typeof BookingStatus.CANCELLED | typeof BookingStatus.REJECTED;
  } | null>(null);

  const listParams = useMemo(
    () => getBookingListQueryParams(activeTab, statusFilter, TABS, orderNumberSearch),
    [activeTab, statusFilter, orderNumberSearch],
  );
  const hasOrderSearch = Boolean(listParams.search);

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', 'provider', listParams],
    queryFn: () => api.bookings(token!, listParams),
    enabled: !!token,
    placeholderData: keepPreviousData,
    refetchInterval: 20_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const visibleBookings = data?.items ?? [];

  useEffect(() => {
    if (!highlightId || !visibleBookings.length) return;
    const el = document.getElementById(`booking-${highlightId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId, visibleBookings]);

  useEffect(() => {
    if (dispatchAcceptError) {
      setActionError(dispatchAcceptError);
    }
  }, [dispatchAcceptError]);

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      status,
      cancelReason,
    }: {
      id: string;
      status: BookingStatus;
      cancelReason?: string;
    }) => {
      if (!token) throw new Error('Autentifikasiya tələb olunur');
      return api.updateBookingStatus(token, id, status, { cancelReason });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: BOOKING_ATTENTION_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['dispatch', 'pending'] });
      setActionId(null);
      setRescheduleId(null);
      setCancelBooking(null);
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

  const handleInstantAccept = (offerId: string, bookingId: string) => {
    setActionError(null);
    setRescheduleId(null);
    setActionId(bookingId);
    acceptDispatchOffer(offerId, {
      onSettled: () => setActionId(null),
      onError: (error) => {
        if (error instanceof ApiError) {
          setActionError(error.message);
        } else {
          setActionError('Təcili sifariş qəbul edilərkən xəta baş verdi');
        }
      },
    });
  };

  const handleInstantReject = (offerId: string, bookingId: string) => {
    setActionError(null);
    setRescheduleId(null);
    setActionId(bookingId);
    rejectDispatchOffer(offerId, {
      onSettled: () => setActionId(null),
      onError: (error) => {
        if (error instanceof ApiError) {
          setActionError(error.message);
        } else {
          setActionError('Təcili sifariş rədd edilərkən xəta baş verdi');
        }
      },
    });
  };

  const handleAction = (id: string, status: BookingStatus) => {
    if (
      status === BookingStatus.CANCELLED ||
      status === BookingStatus.REJECTED
    ) {
      const booking = visibleBookings.find((b) => b.id === id);
      setActionError(null);
      setRescheduleId(null);
      setCancelBooking({
        id,
        serviceTitle: booking?.serviceTitle ?? '',
        status,
      });
      return;
    }
    setActionError(null);
    setRescheduleId(null);
    setActionId(id);
    updateMutation.mutate({ id, status });
  };

  const handleConfirmCancel = (reason: string) => {
    if (!cancelBooking) return;
    setActionId(cancelBooking.id);
    updateMutation.mutate({
      id: cancelBooking.id,
      status: cancelBooking.status,
      cancelReason: reason,
    });
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
          Planlı sifarişləri təsdiqləyin; təcili sifarişlər onlayn və uyğun xidmət
          verənlərə göstərilir — qəbul edənə qədər digərlərində də görünür.
        </p>
      </div>

      <ProviderAvailabilityCard />

      {actionError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      <BookingStatusFilters
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onOrderNumberSearchChange={setOrderNumberSearch}
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      )}

      {!isLoading && visibleBookings.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            {hasOrderSearch
              ? 'Bu nömrəyə uyğun sifariş tapılmadı'
              : 'Bu kateqoriyada sifariş yoxdur'}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:gap-4">
        {visibleBookings.map((booking) => {
          const isPending = booking.status === BookingStatus.PENDING;
          const isInstantPending =
            booking.type === BookingType.INSTANT &&
            booking.status === BookingStatus.PENDING;
          const offerId = booking.dispatchOfferId ?? null;
          const offerBusy =
            (acceptingOfferId != null && acceptingOfferId === offerId) ||
            (rejectingOfferId != null && rejectingOfferId === offerId) ||
            actionId === booking.id;
          const showCancelReason =
            Boolean(booking.cancelReason) &&
            (booking.status === BookingStatus.CANCELLED ||
              booking.status === BookingStatus.REJECTED);

          return (
            <Card
              key={booking.id}
              id={`booking-${booking.id}`}
              className={cn(
                isPending &&
                  'border-brand ring-2 ring-brand ring-offset-2 ring-offset-background',
              )}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <h3 className="min-w-0 font-semibold">
                    <Link
                      href={`/dashboard/provider/bookings/${booking.id}`}
                      className="hover:underline"
                    >
                      {booking.serviceTitle}
                    </Link>
                  </h3>
                  <BookingCardActions>
                    {isInstantPending && offerId && (
                      <>
                        <Button
                          size="sm"
                          disabled={offerBusy}
                          onClick={() => handleInstantAccept(offerId, booking.id)}
                        >
                          {offerBusy && acceptingOfferId === offerId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Təsdiq et'
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={offerBusy}
                          onClick={() => handleInstantReject(offerId, booking.id)}
                        >
                          {offerBusy && rejectingOfferId === offerId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'İmtina et'
                          )}
                        </Button>
                      </>
                    )}
                    {booking.status === BookingStatus.PENDING &&
                      booking.type !== BookingType.INSTANT && (
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
                          İmtina et
                        </Button>
                      </>
                    )}
                    {booking.status === BookingStatus.CONFIRMED && (
                      <>
                        <Button
                          size="sm"
                          disabled={actionId === booking.id}
                          onClick={() => handleAction(booking.id, BookingStatus.EN_ROUTE)}
                        >
                          Yola çıxdım
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actionId === booking.id}
                          onClick={() => handleAction(booking.id, BookingStatus.CANCELLED)}
                        >
                          Ləğv et
                        </Button>
                      </>
                    )}
                    {booking.status === BookingStatus.EN_ROUTE && (
                      <>
                        <Button
                          size="sm"
                          disabled={actionId === booking.id}
                          onClick={() => handleAction(booking.id, BookingStatus.ARRIVED)}
                        >
                          Ünvana çatdım
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actionId === booking.id}
                          onClick={() => handleAction(booking.id, BookingStatus.CANCELLED)}
                        >
                          Ləğv et
                        </Button>
                      </>
                    )}
                    {booking.status === BookingStatus.ARRIVED && (
                      <>
                        <Button
                          size="sm"
                          disabled={actionId === booking.id}
                          onClick={() => handleAction(booking.id, BookingStatus.IN_PROGRESS)}
                        >
                          İcraya başla
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actionId === booking.id}
                          onClick={() => handleAction(booking.id, BookingStatus.CANCELLED)}
                        >
                          Ləğv et
                        </Button>
                      </>
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
                    <BookingMessageButton
                      status={booking.status}
                      loading={messageLoadingId === booking.id}
                      onClick={() => handleMessage(booking.id)}
                    />
                  </BookingCardActions>
                </div>

                <div className="mt-2.5 space-y-1 text-sm sm:mt-1.5 sm:space-y-1.5">
                  <BookingOrderNumber value={booking.orderNumber} />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-foreground">Sifariş növü:</span>
                    {booking.type === BookingType.INSTANT ? (
                      <Badge className="bg-brand px-1.5 py-0 text-sm font-normal leading-5 text-brand-foreground">
                        {BOOKING_TYPE_LABELS[BookingType.INSTANT]}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">
                        {BOOKING_TYPE_LABELS[booking.type]}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-foreground">Sifarişin statusu:</span>
                    <BookingStatusBadge
                      booking={booking}
                      className="px-1.5 py-0 text-sm font-normal leading-5"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-foreground">Müştəri:</span>
                    <span className="text-muted-foreground">{booking.customerName}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-foreground">Tarix və saat:</span>
                      <span className="text-muted-foreground">
                        {formatBookingDateTime(booking)}
                      </span>
                  </div>
                  {booking.proposedScheduledAt && (
                    <div className="flex flex-wrap items-center gap-2 text-amber-700 dark:text-amber-400">
                      <span className="text-foreground">Təklif olunan tarix və saat:</span>
                      <span>
                        {formatDateTime(booking.proposedScheduledAt)}{' '}
                        (müştəri təsdiqi gözlənilir)
                      </span>
                    </div>
                  )}
                  {booking.notes && (
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 text-foreground">Qeyd:</span>
                      <span className="min-w-0 flex-1 break-words text-muted-foreground">
                        {booking.notes}
                      </span>
                    </div>
                  )}
                  {showCancelReason && (
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 text-foreground">Səbəb:</span>
                      <span className="min-w-0 flex-1 break-words text-muted-foreground">
                        {booking.cancelReason}
                      </span>
                    </div>
                  )}
                  <BookingAddressBlock
                    address={booking.address}
                    destLat={booking.destLat}
                    destLng={booking.destLng}
                  />
                </div>

                {booking.imageUrl && (
                  <div className="mt-2.5 sm:mt-3">
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                      İşin şəkli
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={toDisplayMediaUrl(booking.imageUrl)}
                      alt="Görüləcək işin şəkli"
                      className="max-h-48 max-w-full rounded-xl border border-border object-contain"
                    />
                  </div>
                )}

                {rescheduleId === booking.id && (
                  <RescheduleForm
                    bookingId={booking.id}
                    onCancel={() => setRescheduleId(null)}
                    onSuccess={() => {
                      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
                      void queryClient.invalidateQueries({
                        queryKey: BOOKING_ATTENTION_QUERY_KEY,
                      });
                      setRescheduleId(null);
                      setActionError(null);
                    }}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CancelBookingDialog
        open={Boolean(cancelBooking)}
        mode={
          cancelBooking?.status === BookingStatus.REJECTED ? 'reject' : 'cancel'
        }
        serviceTitle={cancelBooking?.serviceTitle}
        pending={updateMutation.isPending && actionId === cancelBooking?.id}
        onClose={() => {
          if (!updateMutation.isPending) setCancelBooking(null);
        }}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
