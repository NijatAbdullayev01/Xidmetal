'use client';

import { Loader2, MessageSquare } from 'lucide-react';
import { BookingStatus, isBookingMessagingEnabled } from '@xidmetal/shared';
import { Button } from '@/components/ui/button';

export const BOOKING_MESSAGE_PENDING_HINT =
  'Mesaj xidmət verən sifarişi qəbul etdikdən sonra aktiv olur';

export function BookingMessageButton({
  status,
  loading,
  onClick,
}: {
  status: BookingStatus;
  loading: boolean;
  onClick: () => void;
}) {
  const enabled = isBookingMessagingEnabled(status);
  const waitingForAccept = status === BookingStatus.PENDING;

  // PENDING: deaktiv düymə; COMPLETED və digər bağlı statuslar: gizlidir
  if (!enabled && !waitingForAccept) {
    return null;
  }

  const button = (
    <Button
      size="sm"
      variant="outline"
      disabled={!enabled || loading}
      onClick={enabled ? onClick : undefined}
      aria-disabled={!enabled}
      aria-label={enabled ? 'Mesaj yaz' : BOOKING_MESSAGE_PENDING_HINT}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <MessageSquare className="h-4 w-4" />
          Mesaj yaz
        </>
      )}
    </Button>
  );

  if (enabled) {
    return button;
  }

  return (
    <span className="inline-flex" title={BOOKING_MESSAGE_PENDING_HINT}>
      {button}
    </span>
  );
}
