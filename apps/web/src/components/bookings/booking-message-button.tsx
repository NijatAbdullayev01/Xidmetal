'use client';

import type { ReactNode } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { BookingStatus, isBookingMessagingEnabled } from '@xidmetal/shared';
import { Button } from '@/components/ui/button';

export const BOOKING_MESSAGE_PENDING_HINT =
  'Mesaj xidmət verən sifarişi qəbul etdikdən sonra aktiv olur';

/** Sifariş kartı əməliyyat düymələri: mobilə bir cərgə, eyni görünüş. */
export function BookingCardActions({ children }: { children: ReactNode }) {
  return (
    <div className="hidden min-w-0 has-[*]:flex flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain scrollbar-none sm:min-w-0 sm:shrink-0 sm:flex-wrap sm:justify-end sm:gap-2 sm:overflow-visible [&>span]:inline-flex [&>span]:shrink-0 [&_button]:h-8 [&_button]:shrink-0 [&_button]:touch-manipulation [&_button]:gap-1.5 [&_button]:whitespace-nowrap [&_button]:px-2.5 [&_button]:text-sm sm:[&_button]:gap-2 sm:[&_button]:px-3">
      {children}
    </div>
  );
}

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
    <span className="inline-flex shrink-0" title={BOOKING_MESSAGE_PENDING_HINT}>
      {button}
    </span>
  );
}
