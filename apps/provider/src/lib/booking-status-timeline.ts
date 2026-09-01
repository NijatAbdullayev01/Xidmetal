import { BookingStatus } from '@xidmetal/shared';
import { BOOKING_STATUS_LABELS } from '@/lib/provider-labels';

export interface BookingStatusTimelineInput {
  status: BookingStatus;
  createdAt: string;
  acceptedAt?: string | null;
  enRouteAt?: string | null;
  arrivedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
}

export interface BookingStatusTimelineEntry {
  status: BookingStatus;
  label: string;
  at: string | null;
  current: boolean;
  reached: boolean;
}

const PROGRESS_STATUSES: readonly BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
];

function isStoppedStatus(status: BookingStatus): boolean {
  return status === BookingStatus.CANCELLED || status === BookingStatus.REJECTED;
}

export function timestampForBookingStatus(
  status: BookingStatus,
  booking: BookingStatusTimelineInput,
): string | null {
  switch (status) {
    case BookingStatus.PENDING:
      return booking.createdAt || null;
    case BookingStatus.CONFIRMED:
      return booking.acceptedAt ?? null;
    case BookingStatus.EN_ROUTE:
      return booking.enRouteAt ?? null;
    case BookingStatus.ARRIVED:
      return booking.arrivedAt ?? null;
    case BookingStatus.IN_PROGRESS:
      return booking.startedAt ?? null;
    case BookingStatus.COMPLETED:
      return booking.completedAt ?? null;
    case BookingStatus.CANCELLED:
    case BookingStatus.REJECTED:
      return booking.cancelledAt ?? null;
  }
}

function toEntry(
  status: BookingStatus,
  booking: BookingStatusTimelineInput,
  reached: boolean,
): BookingStatusTimelineEntry {
  return {
    status,
    label: BOOKING_STATUS_LABELS[status],
    at: reached ? timestampForBookingStatus(status, booking) : null,
    current: booking.status === status,
    reached,
  };
}

/** Sifariş statuslarının vaxt cədvəli — keçilmiş addımlar + növbəti mərhələlər. */
export function buildBookingStatusTimeline(
  booking: BookingStatusTimelineInput,
): BookingStatusTimelineEntry[] {
  if (isStoppedStatus(booking.status)) {
    const reachedProgress = PROGRESS_STATUSES.filter((status) => {
      if (status === BookingStatus.PENDING) return true;
      return Boolean(timestampForBookingStatus(status, booking));
    });

    return [
      ...reachedProgress.map((status) => toEntry(status, booking, true)),
      toEntry(booking.status, booking, true),
    ];
  }

  const currentIndex = PROGRESS_STATUSES.indexOf(booking.status);
  const reachedThrough = currentIndex < 0 ? 0 : currentIndex;

  return PROGRESS_STATUSES.map((status, index) =>
    toEntry(status, booking, index <= reachedThrough),
  );
}
