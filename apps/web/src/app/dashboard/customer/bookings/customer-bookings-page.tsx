'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, CalendarClock, Star } from 'lucide-react';
import {
  BookingStatus,
  BookingType,
  DISPATCH,
  isBookingPriceVisibleToCustomer,
  isBookingProviderRatingVisible,
  isCancellableBookingStatus,
  isInstantProviderSkippable,
  toDisplayMediaUrl,
  formatBookingDateTime,
} from '@xidmetal/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookingAddressBlock } from '@/components/bookings/booking-address-block';
import { ReviewDialog } from '@/components/bookings/review-dialog';
import { CancelBookingDialog } from '@/components/bookings/cancel-booking-dialog';
import { InstantWaitingCard } from '@/components/bookings/instant-waiting-card';
import { InstantSkipProviderCard } from '@/components/bookings/instant-skip-provider-card';
import { BookingMessageButton } from '@/components/bookings/booking-message-button';
import { BookingOrderNumber } from '@/components/bookings/booking-order-number';
import { BookingProviderName } from '@/components/bookings/booking-provider-name';
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge';
import { useBookingsRealtimeInvalidation } from '@/hooks/use-booking-tracking';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useAckBookingNotifications } from '@/hooks/use-ack-booking-notifications';
import { BOOKING_ATTENTION_QUERY_KEY } from '@/hooks/use-booking-notifications';
import { formatPrice, formatDateTime, cn } from '@/lib/utils';
import { BOOKING_TYPE_LABELS } from '@/lib/provider-labels';
import {
  BookingStatusFilters,
  buildBookingStatusTabs,
  getBookingListQueryParams,
  type BookingStatusTabKey,
} from '@/components/bookings/booking-status-filters';

const TABS = buildBookingStatusTabs('Ləğv / imtina');

export function CustomerBookingsPage() {
  const token = useAuthToken();
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const queryClient = useQueryClient();
  useAckBookingNotifications(!!token);
  useBookingsRealtimeInvalidation(!!token);
  const [activeTab, setActiveTab] = useState<BookingStatusTabKey>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderNumberSearch, setOrderNumberSearch] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [messageLoadingId, setMessageLoadingId] = useState<string | null>(null);
  const [reviewBooking, setReviewBooking] = useState<{
    id: string;
    serviceTitle: string;
  } | null>(null);
  const [cancelBooking, setCancelBooking] = useState<{
    id: string;
    serviceTitle: string;
  } | null>(null);

  const listParams = useMemo(
    () => getBookingListQueryParams(activeTab, statusFilter, TABS, orderNumberSearch),
    [activeTab, statusFilter, orderNumberSearch],
  );
  const hasOrderSearch = Boolean(listParams.search);

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', listParams],
    queryFn: () => api.bookings(token!, listParams),
    enabled: !!token,
    placeholderData: keepPreviousData,
    refetchInterval: 20_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!highlightId || !data?.items.length) return;
    const el = document.getElementById(`booking-${highlightId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId, data?.items]);

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
      setActionId(null);
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
      router.push(`/dashboard/customer/messages?conversationId=${conversation.id}`);
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
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: BOOKING_ATTENTION_QUERY_KEY });
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
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: BOOKING_ATTENTION_QUERY_KEY });
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

  const skipProviderMutation = useMutation({
    mutationFn: (id: string) => {
      if (!token) throw new Error('Autentifikasiya tələb olunur');
      return api.skipBookingProvider(token, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: BOOKING_ATTENTION_QUERY_KEY });
      setActionId(null);
      setActionError(null);
    },
    onError: (error) => {
      setActionId(null);
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else {
        setActionError('Başqa xidmət verən axtarılarkən xəta baş verdi');
      }
    },
  });

  const handleCancel = (booking: { id: string; serviceTitle: string }) => {
    setActionError(null);
    setCancelBooking(booking);
  };

  const handleConfirmCancel = (reason: string) => {
    if (!cancelBooking) return;
    setActionId(cancelBooking.id);
    updateMutation.mutate({
      id: cancelBooking.id,
      status: BookingStatus.CANCELLED,
      cancelReason: reason,
    });
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

  const handleReviewSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: ['bookings'] });
    void queryClient.invalidateQueries({ queryKey: ['reviews'] });
    setReviewBooking(null);
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

      {!isLoading && data?.items.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            {hasOrderSearch
              ? 'Bu nömrəyə uyğun sifariş tapılmadı'
              : 'Bu kateqoriyada sifariş yoxdur'}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {data?.items.map((booking) => {
          const isInstantPending =
            booking.type === BookingType.INSTANT &&
            booking.status === BookingStatus.PENDING;
          const isInstantUnassigned = isInstantPending && !booking.acceptedAt;
          const canSkipProvider = isInstantProviderSkippable(
            booking.type,
            booking.status,
          );
          const isPending = booking.status === BookingStatus.PENDING;

          return (
            <Card
              key={booking.id}
              id={`booking-${booking.id}`}
              className={cn(
                isPending &&
                  'border-brand ring-2 ring-brand ring-offset-2 ring-offset-background',
              )}
            >
              <CardContent className="p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <h3 className="min-w-0 font-semibold">
                    <Link
                      href={`/dashboard/customer/bookings/${booking.id}`}
                      className="hover:underline"
                    >
                      {booking.serviceTitle}
                    </Link>
                  </h3>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {booking.proposedScheduledAt &&
                      booking.status === BookingStatus.PENDING && (
                        <>
                          <Button
                            size="sm"
                            disabled={actionId === booking.id}
                            onClick={() => handleConfirmReschedule(booking.id)}
                          >
                            {actionId === booking.id &&
                            confirmRescheduleMutation.isPending ? (
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
                            {actionId === booking.id &&
                            rejectRescheduleMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Təklifi rədd et'
                            )}
                          </Button>
                        </>
                      )}
                    {isCancellableBookingStatus(booking.status) && !isInstantPending && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={actionId === booking.id}
                        onClick={() =>
                          handleCancel({
                            id: booking.id,
                            serviceTitle: booking.serviceTitle,
                          })
                        }
                      >
                        {actionId === booking.id && updateMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Ləğv et'
                        )}
                      </Button>
                    )}
                    {booking.status === BookingStatus.COMPLETED && !booking.hasReview && (
                      <Button
                        size="sm"
                        onClick={() =>
                          setReviewBooking({
                            id: booking.id,
                            serviceTitle: booking.serviceTitle,
                          })
                        }
                      >
                        <Star className="h-4 w-4" />
                        İşi təsdiqlə və rəy yaz
                      </Button>
                    )}
                    {booking.status === BookingStatus.COMPLETED && booking.hasReview && (
                      <Badge variant="success">Rəy verildi</Badge>
                    )}
                    <BookingMessageButton
                      status={booking.status}
                      loading={messageLoadingId === booking.id}
                      onClick={() => handleMessage(booking.id)}
                    />
                  </div>
                </div>

                <div className="mt-1.5 space-y-1.5 text-sm">
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
                  {!isInstantUnassigned && (
                    <BookingProviderName
                      providerId={booking.providerId}
                      providerName={booking.providerName}
                      rating={booking.providerRating}
                      reviewCount={booking.providerReviewCount}
                      showRating={isBookingProviderRatingVisible(
                        booking.type,
                        booking.acceptedAt,
                      )}
                    />
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-foreground">Tarix və saat:</span>
                      <span className="text-muted-foreground">
                        {formatBookingDateTime(booking)}
                      </span>
                  </div>
                  {isBookingPriceVisibleToCustomer(
                    booking.status,
                    booking.acceptedAt,
                  ) && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-foreground">Qiymət:</span>
                      <span className="text-muted-foreground">
                        {formatPrice(booking.totalPrice)}
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
                  {Boolean(booking.cancelReason) &&
                    (booking.status === BookingStatus.CANCELLED ||
                      booking.status === BookingStatus.REJECTED) && (
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

                {canSkipProvider && (
                  <div className="mt-3">
                    <InstantSkipProviderCard
                      providerId={booking.providerId}
                      providerName={booking.providerName}
                      providerRating={booking.providerRating}
                      providerReviewCount={booking.providerReviewCount}
                      skipCount={booking.dispatchSkipCount}
                      maxSkips={DISPATCH.MAX_CUSTOMER_PROVIDER_SKIPS}
                      pending={
                        actionId === booking.id && skipProviderMutation.isPending
                      }
                      disabled={actionId === booking.id}
                      onSkip={() => {
                        setActionError(null);
                        setActionId(booking.id);
                        skipProviderMutation.mutate(booking.id);
                      }}
                    />
                  </div>
                )}

                {booking.proposedScheduledAt &&
                  booking.status === BookingStatus.PENDING && (
                    <div className="mt-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 dark:border-amber-700/50 dark:bg-amber-950/30">
                      <div className="flex items-start gap-2">
                        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                            Xidmət verən yeni tarix təklif edib
                          </p>
                          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                            Təklif olunan tarix və saat:{' '}
                            <strong>
                              {formatDateTime(booking.proposedScheduledAt)}
                            </strong>
                          </p>
                          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                            Təklifi yuxarıdakı düymələrlə təsdiq və ya rədd edə
                            bilərsiniz. Mesaj yazmaq xidmət verən sifarişi qəbul
                            etdikdən sonra aktiv olacaq.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                {booking.imageUrl && (
                  <div className="mt-3">
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
                {isInstantPending && (
                  <InstantWaitingCard
                    createdAt={booking.createdAt}
                    searchStartedAt={booking.dispatchWindowStartedAt}
                    onCancel={() =>
                      handleCancel({
                        id: booking.id,
                        serviceTitle: booking.serviceTitle,
                      })
                    }
                    cancelDisabled={actionId === booking.id}
                    cancelPending={
                      actionId === booking.id && updateMutation.isPending
                    }
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {token && reviewBooking && (
        <ReviewDialog
          open={!!reviewBooking}
          onClose={() => setReviewBooking(null)}
          bookingId={reviewBooking.id}
          serviceTitle={reviewBooking.serviceTitle}
          token={token}
          onSuccess={handleReviewSuccess}
        />
      )}

      <CancelBookingDialog
        open={Boolean(cancelBooking)}
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
