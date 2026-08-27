'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { cn, formatDateTime } from '@/lib/utils';
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_VARIANTS,
} from '@/lib/provider-labels';
import {
  buildBookingStatusTimeline,
  type BookingStatusTimelineInput,
} from '@/lib/booking-status-timeline';

export function BookingStatusBadge({
  booking,
  className,
}: {
  booking: BookingStatusTimelineInput;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const label = BOOKING_STATUS_LABELS[booking.status];
  const entries = buildBookingStatusTimeline(booking);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative inline-flex cursor-pointer self-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 before:absolute before:-inset-y-2.5 before:-inset-x-1.5 before:content-['']"
        title="Status vaxtlarına bax"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label} — status vaxtlarına bax`}
      >
        <Badge
          variant={BOOKING_STATUS_VARIANTS[booking.status]}
          className={cn('pointer-events-none', className)}
        >
          {label}
        </Badge>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Status vaxtları"
        description="Sifarişin status dəyişiklikləri və vaxtları"
        panelClassName="max-w-sm"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Status vaxtları
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Hər statusun qeydə alınan vaxtı
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Bağla"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ol className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {entries.map((entry, index) => (
            <li key={entry.status} className="flex gap-3">
              <div className="flex w-3 shrink-0 flex-col items-center">
                <span
                  className={cn(
                    'mt-1.5 size-2.5 shrink-0 rounded-full',
                    entry.current && 'bg-brand ring-4 ring-brand/20',
                    entry.reached && !entry.current && 'bg-foreground',
                    !entry.reached && 'bg-muted-foreground/30',
                  )}
                  aria-hidden
                />
                {index < entries.length - 1 ? (
                  <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
                ) : null}
              </div>
              <div
                className={cn(
                  'min-w-0 flex-1',
                  index < entries.length - 1 ? 'pb-4' : 'pb-1',
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      entry.reached ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {entry.label}
                  </p>
                  {entry.current ? (
                    <span className="rounded-md bg-brand/20 px-1.5 py-0 text-xs font-medium text-brand-foreground">
                      İndiki
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {entry.at ? formatDateTime(entry.at) : '—'}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Modal>
    </>
  );
}
