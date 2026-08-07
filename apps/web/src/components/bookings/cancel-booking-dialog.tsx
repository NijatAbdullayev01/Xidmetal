'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CancelBookingDialogProps {
  open: boolean;
  serviceTitle?: string;
  pending?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function CancelBookingDialog({
  open,
  serviceTitle,
  pending = false,
  onClose,
  onConfirm,
}: CancelBookingDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (pending) return;
    setReason('');
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError('Ləğv səbəbi minimum 3 simvol olmalıdır');
      return;
    }
    if (trimmed.length > 500) {
      setError('Ləğv səbəbi maksimum 500 simvol ola bilər');
      return;
    }
    setError(null);
    onConfirm(trimmed);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Sifarişi ləğv et"
      description={
        serviceTitle
          ? `«${serviceTitle}» sifarişini ləğv etmək üçün səbəb yazın.`
          : 'Sifarişi ləğv etmək üçün səbəb yazın.'
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cancel-reason">Ləğv səbəbi</Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Məsələn: tarix uyğun gəlmir, plan dəyişdi…"
            rows={4}
            maxLength={500}
            disabled={pending}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'cancel-reason-error' : undefined}
          />
          {error && (
            <p id="cancel-reason-error" className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            disabled={pending}
            onClick={handleClose}
          >
            Geriyə
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="min-h-[44px]"
            disabled={pending}
            onClick={handleSubmit}
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Ləğv edilir…
              </>
            ) : (
              'Ləğv et'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
