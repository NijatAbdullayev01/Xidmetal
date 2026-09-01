'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ProviderAvailability,
  formatBookingDateTime,
  type BookingSummary,
} from '@xidmetal/shared';
import { useAuthToken } from '@/hooks/use-auth-token';
import { api } from '@/lib/api';
import { formatBookingAddressDisplay } from '@/lib/booking-address';
import {
  ACTIVE_BOOKING_TAB_STATUSES,
  BOOKING_STATUS_LABELS,
} from '@/lib/provider-labels';
import { cn } from '@/lib/utils';

type DutyState = 'loading' | 'unverified' | 'online' | 'offline' | 'busy';

function resolveDutyState(
  loading: boolean,
  verified: boolean,
  availability: ProviderAvailability,
): DutyState {
  if (loading) return 'loading';
  if (!verified) return 'unverified';
  if (availability === ProviderAvailability.BUSY) return 'busy';
  if (availability === ProviderAvailability.ONLINE) return 'online';
  return 'offline';
}

const DUTY_COPY: Record<
  DutyState,
  { label: string; hint: string; tone: 'live' | 'busy' | 'idle' | 'muted' }
> = {
  loading: {
    label: 'Yüklənir…',
    hint: '',
    tone: 'muted',
  },
  unverified: {
    label: 'Oflayn',
    hint: 'admin təsdiqinə qədər təcili sifariş ala bilməzsiniz',
    tone: 'idle',
  },
  online: {
    label: 'Onlayn',
    hint: 'bu tab açıq qaldıqca təcili sifarişlər gələ bilər',
    tone: 'live',
  },
  offline: {
    label: 'Oflayn',
    hint: 'bu tabı aktiv edin — avtomatik onlayn olursunuz',
    tone: 'idle',
  },
  busy: {
    label: 'Məşğul',
    hint: 'aktiv sifariş bitənə qədər yeni təcili sifariş gəlməyəcək',
    tone: 'busy',
  },
};

/**
 * Xidmət verən əlçatanlıq statusu (avtomatik).
 * Saytda aktiv tab → Onlayn; digər tab / çıxış / bağlama → Oflayn.
 * Məşğul — aktiv sifariş olduqda avtomatik.
 */
export function ProviderAvailabilityCard() {
  const token = useAuthToken();

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => api.users.me(token!),
    enabled: !!token,
    refetchInterval: 15_000,
  });

  const profile = me?.providerProfile;
  const isVerified = profile?.isVerified === true;
  const availability =
    (profile?.availability as ProviderAvailability | undefined) ?? ProviderAvailability.OFFLINE;
  const duty = resolveDutyState(meLoading, isVerified, availability);
  const isBusy = duty === 'busy';
  const copy = DUTY_COPY[duty];

  const { data: activeBookingsData, isLoading: activeBookingsLoading } = useQuery({
    queryKey: ['bookings', 'provider', 'active-duty'],
    queryFn: () =>
      api.bookings(token!, {
        limit: '5',
        statuses: ACTIVE_BOOKING_TAB_STATUSES.join(','),
      }),
    enabled: !!token && isBusy,
    refetchInterval: isBusy ? 20_000 : false,
  });

  const activeBooking: BookingSummary | undefined = activeBookingsData?.items?.[0];

  return (
    <section
      aria-live="polite"
      aria-label="Əlçatanlıq statusu"
      className={cn(
        'rounded-xl border px-4 py-3.5 sm:px-5',
        copy.tone === 'live' && 'border-emerald-500/25 bg-emerald-500/[0.06]',
        copy.tone === 'busy' && 'border-amber-500/30 bg-amber-500/[0.06]',
        (copy.tone === 'idle' || copy.tone === 'muted') && 'border-border bg-card',
      )}
    >
      <div className="flex items-start gap-3">
        <StatusDot tone={copy.tone} />

        <p className="min-w-0 flex-1 text-sm leading-snug">
          <span className="font-semibold text-foreground">{copy.label}</span>
          {copy.hint ? (
            <span className="text-muted-foreground">: {copy.hint}</span>
          ) : null}
        </p>
      </div>

      {isBusy ? (
        <div className="mt-2.5 w-full min-w-0">
          <BusyBookingSummary
            booking={activeBooking}
            loading={activeBookingsLoading && !activeBooking}
          />
        </div>
      ) : null}
    </section>
  );
}

function StatusDot({ tone }: { tone: 'live' | 'busy' | 'idle' | 'muted' }) {
  return (
    <span className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0" aria-hidden>
      {tone === 'live' ? (
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/50" />
      ) : null}
      <span
        className={cn(
          'relative h-2.5 w-2.5 rounded-full',
          tone === 'live' && 'bg-emerald-500',
          tone === 'busy' && 'bg-amber-500',
          (tone === 'idle' || tone === 'muted') && 'bg-muted-foreground/40',
        )}
      />
    </span>
  );
}

function BusyBookingSummary({
  booking,
  loading,
}: {
  booking: BookingSummary | undefined;
  loading: boolean;
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Aktiv sifariş yüklənir…</p>;
  }

  if (!booking) {
    return (
      <p className="text-sm text-muted-foreground">
        Status məşğuldur; aktiv sifariş siyahıda görünməyə bilər.
      </p>
    );
  }

  const meta = [
    booking.customerName,
    BOOKING_STATUS_LABELS[booking.status],
    formatBookingDateTime(booking),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="w-full min-w-0 rounded-lg border border-border/60 bg-background/60 px-3 py-2.5">
      <p className="break-words text-sm font-medium text-foreground">{booking.serviceTitle}</p>
      <p className="mt-0.5 break-words text-xs text-muted-foreground sm:text-sm">{meta}</p>
      {booking.address ? (
        <p className="mt-0.5 break-words text-xs text-muted-foreground sm:text-sm">
          Ünvan: {formatBookingAddressDisplay(booking.address)}
        </p>
      ) : null}
    </div>
  );
}
