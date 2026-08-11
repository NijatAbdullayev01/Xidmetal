'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const MIN_REASON_LENGTH = 3;
const MAX_REASON_LENGTH = 500;

const CANCEL_QUICK_REASONS = [
  'Tarix uyğun gəlmir',
  'Plan dəyişdi',
  'Qiymət uyğun deyil',
  'Başqa seçim etdim',
] as const;

const REJECT_QUICK_REASONS = [
  'Tarix uyğun gəlmir',
  'İş yüküm doludur',
  'Ərazi uzaqdır',
  'Xidmət növü uyğun deyil',
] as const;

export type CancelBookingDialogMode = 'cancel' | 'reject';

interface CancelBookingDialogProps {
  open: boolean;
  /** cancel = ləğv (müştəri/xidmət verən); reject = imtina (xidmət verən PENDING) */
  mode?: CancelBookingDialogMode;
  serviceTitle?: string;
  pending?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function CancelBookingDialog({
  open,
  mode = 'cancel',
  serviceTitle,
  pending = false,
  onClose,
  onConfirm,
}: CancelBookingDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedQuick, setSelectedQuick] = useState<string | null>(null);

  const isReject = mode === 'reject';
  const quickReasons = isReject ? REJECT_QUICK_REASONS : CANCEL_QUICK_REASONS;
  const reasonLabel = isReject ? 'İmtina səbəbi' : 'Ləğv səbəbi';
  const title = isReject ? 'Sifarişdən imtina et' : 'Sifarişi ləğv et';
  const confirmLabel = isReject ? 'Bəli, imtina et' : 'Bəli, ləğv et';
  const pendingLabel = isReject ? 'İmtina edilir…' : 'Ləğv edilir…';

  useEffect(() => {
    if (!open) return;
    setReason('');
    setError(null);
    setSelectedQuick(null);
  }, [open]);

  const trimmedLength = reason.trim().length;
  const canSubmit = trimmedLength >= MIN_REASON_LENGTH && trimmedLength <= MAX_REASON_LENGTH;

  const handleClose = () => {
    if (pending) return;
    onClose();
  };

  const handleReasonChange = (value: string) => {
    setReason(value);
    setSelectedQuick(null);
    if (error) setError(null);
  };

  const handleQuickReason = (quick: string) => {
    if (pending) return;
    setSelectedQuick(quick);
    setReason(quick);
    setError(null);
  };

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (trimmed.length < MIN_REASON_LENGTH) {
      setError(`${reasonLabel} minimum ${MIN_REASON_LENGTH} simvol olmalıdır`);
      return;
    }
    if (trimmed.length > MAX_REASON_LENGTH) {
      setError(`${reasonLabel} maksimum ${MAX_REASON_LENGTH} simvol ola bilər`);
      return;
    }
    setError(null);
    onConfirm(trimmed);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      description={
        serviceTitle
          ? isReject
            ? `«${serviceTitle}» sifarişindən imtina etmək üçün səbəb yazın.`
            : `«${serviceTitle}» sifarişini ləğv etmək üçün səbəb yazın.`
          : isReject
            ? 'Sifarişdən imtina etmək üçün səbəb yazın.'
            : 'Sifarişi ləğv etmək üçün səbəb yazın.'
      }
      panelClassName="max-w-md"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {serviceTitle ? (
                <>
                  <span className="font-medium text-foreground">&ldquo;{serviceTitle}&rdquo;</span>{' '}
                  {isReject ? 'sifarişindən imtina ediləcək' : 'sifarişi ləğv olunacaq'}
                </>
              ) : (
                'Bu əməliyyatı təsdiqləyin'
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          disabled={pending}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          aria-label="Bağla"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm leading-relaxed text-muted-foreground">
          {isReject
            ? 'İmtina etdikdən sonra sifariş rədd ediləcək. Müştəriyə bildiriş göndəriləcək.'
            : 'Ləğv etdikdən sonra sifariş aktiv siyahıdan çıxarılacaq. Əks tərəfə bildiriş göndəriləcək.'}
        </p>

        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Tez seçim</p>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={isReject ? 'Tez imtina səbəbləri' : 'Tez ləğv səbəbləri'}
            >
              {quickReasons.map((quick) => {
                const isSelected = selectedQuick === quick;
                return (
                  <button
                    key={quick}
                    type="button"
                    disabled={pending}
                    onClick={() => handleQuickReason(quick)}
                    className={cn(
                      'min-h-10 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
                      'disabled:pointer-events-none disabled:opacity-50',
                      isSelected
                        ? 'border-destructive/40 bg-destructive/10 font-medium text-destructive'
                        : 'border-border bg-background text-foreground hover:bg-muted',
                    )}
                  >
                    {quick}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-end justify-between gap-3">
              <Label htmlFor="cancel-reason">{reasonLabel}</Label>
              <span
                className={cn(
                  'tabular-nums text-xs',
                  trimmedLength > MAX_REASON_LENGTH
                    ? 'text-destructive'
                    : 'text-muted-foreground',
                )}
                aria-live="polite"
              >
                {reason.length}/{MAX_REASON_LENGTH}
              </span>
            </div>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => handleReasonChange(e.target.value)}
              placeholder="Səbəbi qısaca yazın və ya yuxarıdan seçin…"
              rows={3}
              maxLength={MAX_REASON_LENGTH}
              disabled={pending}
              error={Boolean(error)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'cancel-reason-error' : 'cancel-reason-hint'}
              className="min-h-[96px] resize-y"
            />
            {error ? (
              <p id="cancel-reason-error" className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : (
              <p id="cancel-reason-hint" className="text-xs text-muted-foreground">
                Minimum {MIN_REASON_LENGTH} simvol tələb olunur
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full sm:min-h-10 sm:w-auto"
          disabled={pending}
          onClick={handleClose}
        >
          Geri
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="min-h-11 w-full sm:min-h-10 sm:w-auto"
          disabled={pending || !canSubmit}
          onClick={handleSubmit}
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {pendingLabel}
            </>
          ) : (
            confirmLabel
          )}
        </Button>
      </div>
    </Modal>
  );
}
