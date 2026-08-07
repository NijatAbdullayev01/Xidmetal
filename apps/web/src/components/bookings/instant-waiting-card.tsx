'use client';

import { Loader2, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InstantWaitingCardProps {
  onCancel?: () => void;
  cancelDisabled?: boolean;
  cancelPending?: boolean;
}

/**
 * INSTANT sifariş PENDING ikən müştəriyə göstərilən gözləmə bloku.
 */
export function InstantWaitingCard({
  onCancel,
  cancelDisabled,
  cancelPending,
}: InstantWaitingCardProps) {
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
            Yaxın xidmət verənlərə təklif göndərilir…
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Bir nəfər qəbul edənə qədər gözləyin. Bu səhifə avtomatik yenilənir.
          </p>
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
        <Loader2 className="mt-1 h-5 w-5 shrink-0 animate-spin text-brand-dark" aria-hidden />
      </div>
    </div>
  );
}
