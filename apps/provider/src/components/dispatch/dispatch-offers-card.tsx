'use client';

import { Loader2, MapPin, Radio, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDispatchOffers } from '@/hooks/use-dispatch-offers';
import { formatBookingAddressDisplay } from '@/lib/booking-address';

function formatDistance(meters: number | null | undefined): string {
  if (meters == null || !Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatExpires(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'axtarış bitib';
  const min = Math.ceil(ms / 60_000);
  if (min <= 1) return '1 dəq-ə qədər';
  return `${min} dəq-ə qədər`;
}

/**
 * Provider dashboard — aktiv on-demand təkliflər (accept/reject).
 */
export function DispatchOffersCard() {
  const {
    offers,
    isLoading,
    error,
    toast,
    clearToast,
    accept,
    reject,
    acceptingId,
    rejectingId,
    acceptError,
    wsConnected,
  } = useDispatchOffers(true);

  if (!isLoading && offers.length === 0 && !toast && !error) {
    return null;
  }

  return (
    <Card className="border-brand/40">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base sm:text-lg">Təcili sifariş təklifləri</CardTitle>
            <CardDescription className="mt-1">
              Eyni xidmət növü üzrə təcili sifarişlər — təsdiq və ya imtina edin
              {wsConnected ? ' · canlı' : ' · yeniləmə'}
            </CardDescription>
          </div>
          <Radio
            className={`h-5 w-5 shrink-0 ${wsConnected ? 'text-brand' : 'text-muted-foreground'}`}
            aria-hidden
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {toast && (
          <div
            className="flex items-start justify-between gap-2 rounded-lg bg-brand/15 px-3 py-2 text-sm"
            role="status"
          >
            <span>{toast}</span>
            <button
              type="button"
              onClick={clearToast}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              aria-label="Bağla"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {acceptError && (
          <p className="text-sm text-destructive" role="alert">
            {acceptError}
          </p>
        )}

        {isLoading && offers.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Yüklənir…
          </div>
        )}

        {offers.map((offer) => {
          const busy =
            acceptingId === offer.id || rejectingId === offer.id;
          return (
            <div
              key={offer.id}
              className="rounded-xl border border-border bg-card p-3 sm:p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium leading-snug">
                    {offer.booking?.serviceTitle ?? 'Sifariş'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {offer.booking?.customerName}
                  </p>
                  {offer.booking?.address && (
                    <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        <span className="text-foreground">Ünvan:</span>{' '}
                        {formatBookingAddressDisplay(offer.booking.address)}
                      </span>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {offer.distanceM != null && Number.isFinite(offer.distanceM)
                      ? `Məsafə: ${formatDistance(offer.distanceM)} · `
                      : ''}
                    Axtarış: {formatExpires(offer.expiresAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => reject(offer.id)}
                    className="min-h-11 flex-1 sm:flex-none"
                  >
                    {rejectingId === offer.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Rədd'
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => accept(offer.id)}
                    className="min-h-11 flex-1 bg-brand text-brand-foreground hover:bg-brand-dark sm:flex-none"
                  >
                    {acceptingId === offer.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Qəbul et'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
