'use client';

import { useEffect, useState } from 'react';
import { Loader2, Radio } from 'lucide-react';
import { DISPATCH } from '@xidmetal/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InstantWaitingCardProps {
  /** Sifariş yaradılma vaxtı (ISO) — axtarış pəncərəsi buradan hesablanır */
  createdAt: string;
  /** Skip sonrası yenilənmiş pəncərə başlanğıcı */
  searchStartedAt?: string | null;
  onCancel?: () => void;
  cancelDisabled?: boolean;
  cancelPending?: boolean;
}

function searchWindowEndsAt(createdAt: string, searchWindowSec: number): number {
  const createdMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) return Date.now();
  return createdMs + searchWindowSec * 1000;
}

function formatCountdown(remainingMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * INSTANT sifariş PENDING ikən müştəriyə göstərilən gözləmə bloku.
 * Axtarış pəncərəsi: booking.createdAt + DISPATCH.SEARCH_WINDOW_SEC (default 10 dəq).
 */
export function InstantWaitingCard({
  createdAt,
  searchStartedAt,
  onCancel,
  cancelDisabled,
  cancelPending,
}: InstantWaitingCardProps) {
  const windowSec = DISPATCH.SEARCH_WINDOW_SEC;
  const windowMinutes = Math.max(1, Math.round(windowSec / 60));
  const endsAt = searchWindowEndsAt(searchStartedAt || createdAt, windowSec);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [createdAt, searchStartedAt]);

  const remainingMs = endsAt - now;
  const expired = remainingMs <= 0;
  const progress = Math.min(
    1,
    Math.max(0, remainingMs / (windowSec * 1000)),
  );
  const countdown = formatCountdown(remainingMs);

  return (
    <div
      className="mt-3 rounded-xl border border-brand/40 bg-brand/10 px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/30">
          <Radio className="h-4 w-4 animate-pulse text-brand-foreground" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {expired
              ? 'Axtarış müddəti bitdi'
              : 'Yaxın xidmət verənlərə təklif göndərilir…'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {expired
              ? 'Uyğun xidmət verən tapılmadıqda sifariş avtomatik ləğv olunacaq. Bu səhifə avtomatik yenilənir.'
              : 'Bir nəfər qəbul edənə qədər gözləyin. Qiymət qəbul edən xidmət verənin tarifinə görə dəqiqləşəcək.'}
          </p>

          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Axtarış müddəti
              </span>
              <time
                dateTime={new Date(endsAt).toISOString()}
                className={cn(
                  'font-mono text-base font-semibold tabular-nums tracking-tight',
                  expired ? 'text-destructive' : 'text-foreground',
                )}
                aria-label={
                  expired
                    ? 'Axtarış müddəti bitib'
                    : `Qalan axtarış müddəti ${countdown}`
                }
              >
                {expired ? '00:00' : countdown}
              </time>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-brand/20"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              aria-label="Axtarış müddəti"
            >
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-1000 ease-linear',
                  expired ? 'bg-destructive/70' : 'bg-brand',
                )}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {expired
                ? `${windowMinutes} dəqiqəlik axtarış pəncərəsi başa çatdı`
                : `Maksimum ${windowMinutes} dəqiqə ərzində xidmət verən axtarılır`}
            </p>
          </div>

          {onCancel && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3 min-h-11"
              disabled={cancelDisabled || cancelPending}
              onClick={onCancel}
            >
              {cancelPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ləğv edilir…
                </>
              ) : (
                'Çağırışı ləğv et'
              )}
            </Button>
          )}
        </div>
        {!expired && (
          <Loader2
            className="mt-1 h-5 w-5 shrink-0 animate-spin text-brand-dark"
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
