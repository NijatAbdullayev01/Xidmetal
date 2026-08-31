'use client';

import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { ProviderReviewsTrigger } from '@/components/reviews/provider-reviews-trigger';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

interface SkipProviderDialogProps {
  open: boolean;
  providerName: string;
  pending?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function SkipProviderDialog({
  open,
  providerName,
  pending = false,
  onClose,
  onConfirm,
}: SkipProviderDialogProps) {
  return (
    <Modal
      open={open}
      onClose={() => {
        if (!pending) onClose();
      }}
      title="Başqa xidmət verən axtarılsın?"
      description="Cari xidmət verən buraxılacaq və onlayn namizədlərə yenidən təklif göndəriləcək."
      panelClassName="max-w-md"
    >
      <div className="space-y-4 p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{providerName}</span>{' '}
          sifarişi qəbul edib. Qiymət xoşunuza gəlmirsə, onu buraxıb başqa
          onlayn xidmət verən axtara bilərsiniz.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={pending}
            onClick={onClose}
          >
            Geri
          </Button>
          <Button
            type="button"
            className="min-h-11"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Axtarılır…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Başqa xidmət verən axtar
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface InstantSkipProviderCardProps {
  providerId: string;
  providerName: string;
  providerRating?: number;
  providerReviewCount?: number;
  skipCount?: number;
  maxSkips: number;
  pending?: boolean;
  disabled?: boolean;
  onSkip: () => void;
}

/**
 * Qəbul olunmuş təcili sifariş — xidmət alan qiyməti bəyənməsə başqa icraçı axtarır.
 */
export function InstantSkipProviderCard({
  providerId,
  providerName,
  providerRating = 0,
  providerReviewCount = 0,
  skipCount = 0,
  maxSkips,
  pending = false,
  disabled = false,
  onSkip,
}: InstantSkipProviderCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const remaining = Math.max(0, maxSkips - skipCount);
  const limitReached = remaining <= 0;

  return (
    <div className="rounded-xl border border-brand/40 bg-brand/10 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            Xidmət verən sifarişi qəbul etdi
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm text-foreground">{providerName}</span>
            <ProviderReviewsTrigger
              providerId={providerId}
              providerName={providerName}
              averageRating={providerRating}
              reviewCount={providerReviewCount}
              compact
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {limitReached
              ? 'Başqa xidmət verən axtarış limiti bitib. Sifarişi ləğv edib yenidən verə bilərsiniz.'
              : 'Qiymət xoşunuza gəlmirsə, bu xidmət verəni buraxıb başqa onlayn namizəd axtara bilərsiniz.'}
          </p>
        </div>
        {!limitReached && (
          <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:items-end sm:self-center">
            <Button
              type="button"
              size="sm"
              className="min-h-11 w-full touch-manipulation sm:w-auto"
              disabled={disabled || pending}
              onClick={() => setConfirmOpen(true)}
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Axtarılır…
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Başqa xidmət verən axtar
                </>
              )}
            </Button>
            {skipCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Qalan axtarış: {remaining}
              </p>
            )}
          </div>
        )}
      </div>
      <SkipProviderDialog
        open={confirmOpen}
        providerName={providerName}
        pending={pending}
        onClose={() => {
          if (!pending) setConfirmOpen(false);
        }}
        onConfirm={() => {
          onSkip();
          setConfirmOpen(false);
        }}
      />
    </div>
  );
}
