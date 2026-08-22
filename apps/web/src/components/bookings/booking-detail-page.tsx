'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarClock,
  Flag,
  Loader2,
  MessageSquare,
  Star,
} from 'lucide-react';
import {
  BookingStatus,
  BookingType,
  UserRole,
  isCancellableBookingStatus,
  isTrackableBookingStatus,
} from '@xidmetal/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookingAddressBlock } from '@/components/bookings/booking-address-block';
import { LiveTrackingMap } from '@/components/bookings/live-tracking-map';
import { ReviewDialog } from '@/components/bookings/review-dialog';
import { CancelBookingDialog } from '@/components/bookings/cancel-booking-dialog';
import { InstantWaitingCard } from '@/components/bookings/instant-waiting-card';
import { useLiveBookingTracking } from '@/hooks/use-live-booking-tracking';
import { useBookingsRealtimeInvalidation } from '@/hooks/use-booking-tracking';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { formatDateTime, formatPrice, cn } from '@/lib/utils';
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_TEXT_CLASSES,
  BOOKING_TYPE_LABELS,
} from '@/lib/provider-labels';

type Role = UserRole.CUSTOMER | UserRole.PROVIDER;

export function BookingDetailPage({
  bookingId,
  role,
}: {
  bookingId: string;
  role: Role;
}) {
  const token = useAuthToken();
  const router = useRouter();
  const queryClient = useQueryClient();
  useBookingsRealtimeInvalidation(!!token);

  const listHref =
    role === UserRole.CUSTOMER
      ? '/dashboard/customer/bookings'
      : '/dashboard/provider/bookings';
  const messagesHref =
    role === UserRole.CUSTOMER
      ? '/dashboard/customer/messages'
      : '/dashboard/provider/messages';

  const [actionError, setActionError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);

  const { data: booking, isLoading, isError, error } = useQuery({
    queryKey: ['bookings', bookingId],
    queryFn: () => api.booking(token!, bookingId),
    enabled: !!token && !!bookingId,
    refetchInterval: 15_000,
  });

  const trackable = booking ? isTrackableBookingStatus(booking.status) : false;
  const { connected, location } = useLiveBookingTracking({
    bookingId,
    status: booking?.status,
    enabled: !!booking && trackable,
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { status: BookingStatus; cancelReason?: string }) =>
      api.updateBookingStatus(token!, bookingId, payload.status, {
        cancelReason: payload.cancelReason,
      }),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err: unknown) => {
      setActionError(err instanceof ApiError ? err.message : 'Əməliyyat uğursuz oldu');
    },
  });

  const startConversation = useMutation({
    mutationFn: () => api.messages.createConversation(token!, { bookingId }),
    onSuccess: (conv) => {
      router.push(`${messagesHref}?conversationId=${encodeURIComponent(conv.id)}`);
    },
    onError: (err: unknown) => {
      setMessageLoading(false);
      setActionError(err instanceof ApiError ? err.message : 'Söhbət açılmadı');
    },
  });

  const handleStatus = (status: BookingStatus, cancelReason?: string) => {
    setActionError(null);
    statusMutation.mutate({ status, cancelReason });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="space-y-4">
        <Link
          href={listHref}
          className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Sifarişlərə qayıt
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {error instanceof ApiError ? error.message : 'Sifariş tapılmadı'}
          </CardContent>
        </Card>
      </div>
    );
  }

  const isInstantPending =
    booking.type === BookingType.INSTANT && booking.status === BookingStatus.PENDING;
  const busy = statusMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href={listHref}
            className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Sifarişlərə qayıt
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{booking.serviceTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {role === UserRole.CUSTOMER ? booking.providerName : booking.customerName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {booking.type === BookingType.INSTANT ? (
            <Badge className="bg-brand text-brand-foreground">
              {BOOKING_TYPE_LABELS[BookingType.INSTANT]}
            </Badge>
          ) : (
            <Badge variant="muted">{BOOKING_TYPE_LABELS[booking.type]}</Badge>
          )}
          <span className={cn('self-center text-sm font-medium', BOOKING_STATUS_TEXT_CLASSES[booking.status])}>
            {BOOKING_STATUS_LABELS[booking.status]}
          </span>
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {isInstantPending && role === UserRole.CUSTOMER && (
        <InstantWaitingCard
          createdAt={booking.createdAt}
          onCancel={() => setCancelOpen(true)}
          cancelDisabled={busy}
          cancelPending={busy}
        />
      )}

      {trackable && (
        <LiveTrackingMap
          destLat={booking.destLat}
          destLng={booking.destLng}
          address={booking.address}
          location={location}
          connected={connected}
          showDirections={role === UserRole.PROVIDER}
        />
      )}

      {!trackable && (
        <BookingAddressBlock
          address={booking.address}
          destLat={booking.destLat}
          destLng={booking.destLng}
          showDirections={role === UserRole.PROVIDER}
        />
      )}

      <Card>
        <CardContent className="space-y-3 p-6 text-sm">
          {booking.type !== BookingType.INSTANT && (
            <p>
              <span className="text-foreground">Tarix: </span>
              <span className="text-muted-foreground">{formatDateTime(booking.scheduledAt)}</span>
            </p>
          )}
          <p>
            <span className="text-foreground">Qiymət: </span>
            <span className="text-muted-foreground">{formatPrice(booking.totalPrice)}</span>
          </p>
          {booking.notes ? (
            <p>
              <span className="text-foreground">Qeyd: </span>
              <span className="text-muted-foreground">{booking.notes}</span>
            </p>
          ) : null}
          {booking.proposedScheduledAt && booking.status === BookingStatus.PENDING && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 dark:border-amber-700/50 dark:bg-amber-950/30">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <p className="text-amber-900 dark:text-amber-100">
                Təklif olunan tarix: {formatDateTime(booking.proposedScheduledAt)}
              </p>
            </div>
          )}
          {Boolean(booking.cancelReason) &&
            (booking.status === BookingStatus.CANCELLED ||
              booking.status === BookingStatus.REJECTED) && (
              <p>
                <span className="text-foreground">Səbəb: </span>
                <span className="text-muted-foreground">{booking.cancelReason}</span>
              </p>
            )}
          {booking.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={booking.imageUrl}
              alt="Görüləcək işin şəkli"
              className="max-h-48 max-w-full rounded-xl border border-border object-contain"
            />
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {role === UserRole.PROVIDER && booking.status === BookingStatus.PENDING && !isInstantPending && (
          <>
            <Button size="sm" disabled={busy} onClick={() => handleStatus(BookingStatus.CONFIRMED)}>
              Təsdiq et
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => handleStatus(BookingStatus.REJECTED)}
            >
              İmtina et
            </Button>
          </>
        )}
        {role === UserRole.PROVIDER && booking.status === BookingStatus.CONFIRMED && (
          <Button size="sm" disabled={busy} onClick={() => handleStatus(BookingStatus.EN_ROUTE)}>
            Yola çıxdım
          </Button>
        )}
        {role === UserRole.PROVIDER && booking.status === BookingStatus.EN_ROUTE && (
          <Button size="sm" disabled={busy} onClick={() => handleStatus(BookingStatus.ARRIVED)}>
            Ünvana çatdım
          </Button>
        )}
        {role === UserRole.PROVIDER && booking.status === BookingStatus.ARRIVED && (
          <Button size="sm" disabled={busy} onClick={() => handleStatus(BookingStatus.IN_PROGRESS)}>
            İcraya başla
          </Button>
        )}
        {role === UserRole.PROVIDER && booking.status === BookingStatus.IN_PROGRESS && (
          <Button size="sm" disabled={busy} onClick={() => handleStatus(BookingStatus.COMPLETED)}>
            Tamamla
          </Button>
        )}
        {isCancellableBookingStatus(booking.status) && !isInstantPending && (
          <Button size="sm" variant="destructive" disabled={busy} onClick={() => setCancelOpen(true)}>
            Ləğv et
          </Button>
        )}
        {role === UserRole.CUSTOMER &&
          booking.status === BookingStatus.COMPLETED &&
          !booking.hasReview && (
            <Button size="sm" onClick={() => setReviewOpen(true)}>
              <Star className="h-4 w-4" />
              Rəy yaz
            </Button>
          )}
        <Button
          size="sm"
          variant="outline"
          disabled={messageLoading || startConversation.isPending}
          onClick={() => {
            setMessageLoading(true);
            startConversation.mutate();
          }}
        >
          {messageLoading || startConversation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <MessageSquare className="h-4 w-4" />
              Mesaj yaz
            </>
          )}
        </Button>
        {role === UserRole.CUSTOMER && (
          <Link
            href={`/dashboard/customer/report?targetType=BOOKING&targetId=${encodeURIComponent(booking.id)}`}
            className={cn(
              'inline-flex h-8 items-center gap-2 rounded-lg border border-border px-3 text-sm',
              'hover:bg-muted',
            )}
          >
            <Flag className="h-4 w-4" />
            Şikayət et
          </Link>
        )}
        {role === UserRole.PROVIDER && (
          <Link
            href={`/dashboard/provider/report?targetType=BOOKING&targetId=${encodeURIComponent(booking.id)}`}
            className={cn(
              'inline-flex h-8 items-center gap-2 rounded-lg border border-border px-3 text-sm',
              'hover:bg-muted',
            )}
          >
            <Flag className="h-4 w-4" />
            Şikayət et
          </Link>
        )}
      </div>

      {token && reviewOpen && (
        <ReviewDialog
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          bookingId={booking.id}
          serviceTitle={booking.serviceTitle}
          token={token}
          onSuccess={() => {
            setReviewOpen(false);
            void queryClient.invalidateQueries({ queryKey: ['bookings'] });
          }}
        />
      )}
      {token && cancelOpen && (
        <CancelBookingDialog
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          serviceTitle={booking.serviceTitle}
          onConfirm={(reason) => {
            setCancelOpen(false);
            handleStatus(BookingStatus.CANCELLED, reason);
          }}
        />
      )}
    </div>
  );
}
