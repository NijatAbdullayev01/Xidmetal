'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Loader2, X } from 'lucide-react';
import { UserRole, type ServiceSummary } from '@xidmetal/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { combineDateAndTime, formatPrice } from '@/lib/utils';
import { getPriceUnitLabel } from '@/lib/provider-labels';

const bookServiceFormSchema = z.object({
  date: z.string().min(1, 'Tarix seçin'),
  time: z.string().min(1, 'Saat seçin'),
  notes: z.string().max(1000).optional(),
  address: z.string().max(500).optional(),
});

type BookServiceFormValues = z.infer<typeof bookServiceFormSchema>;

function getDefaultDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

function getDefaultTime(): string {
  return '10:00';
}

interface BookServiceDialogProps {
  service: ServiceSummary;
  open: boolean;
  onClose: () => void;
}

export function BookServiceDialog({ service, open, onClose }: BookServiceDialogProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<BookServiceFormValues>({
    resolver: zodResolver(bookServiceFormSchema),
    defaultValues: {
      date: getDefaultDate(),
      time: getDefaultTime(),
      notes: '',
      address: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      date: getDefaultDate(),
      time: getDefaultTime(),
      notes: '',
      address: '',
    });
    clearErrors();
  }, [open, reset, clearErrors, service.id]);

  const createMutation = useMutation({
    mutationFn: async (values: BookServiceFormValues) => {
      const token = useAuthStore.getState().tokens?.accessToken;
      if (!token) throw new Error('Autentifikasiya tələb olunur');

      const scheduledAt = combineDateAndTime(values.date, values.time);
      if (new Date(scheduledAt) <= new Date()) {
        throw new Error('Sifariş tarixi gələcəkdə olmalıdır');
      }

      return api.createBooking(token, {
        serviceId: service.id,
        scheduledAt,
        notes: values.notes?.trim() || undefined,
        address: values.address?.trim() || undefined,
      });
    },
    onSuccess: () => {
      onClose();
      if (user?.role === UserRole.CUSTOMER) {
        router.push('/dashboard/customer/bookings');
        return;
      }
      router.push('/dashboard/provider/bookings?view=sent');
    },
    onError: (error) => {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Sifariş yaradılarkən xəta baş verdi';
      setError('root', { message });
    },
  });

  const isSubmitting = createMutation.isPending;
  const today = new Date().toISOString().slice(0, 10);

  const onSubmit = (values: BookServiceFormValues) => {
    clearErrors('root');
    createMutation.mutate(values);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sifariş ver"
      description={`${service.title} xidmətinə sifariş formu`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">Sifariş ver</h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">{service.title}</p>
          <p className="mt-1 text-sm font-medium">
            {formatPrice(service.price)} / {getPriceUnitLabel(service.priceUnit)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Bağla"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
        <div className="space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`booking-date-${service.id}`}>Tarix</Label>
              <Input
                id={`booking-date-${service.id}`}
                type="date"
                min={today}
                error={!!errors.date}
                disabled={isSubmitting}
                {...register('date')}
              />
              {errors.date && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.date.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`booking-time-${service.id}`}>Saat</Label>
              <Input
                id={`booking-time-${service.id}`}
                type="time"
                error={!!errors.time}
                disabled={isSubmitting}
                {...register('time')}
              />
              {errors.time && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.time.message}
                </p>
              )}
            </div>
          </div>

          {!service.isRemote && (
            <div className="space-y-2">
              <Label htmlFor={`booking-address-${service.id}`}>Ünvan</Label>
              <Input
                id={`booking-address-${service.id}`}
                placeholder="Xidmətin göstəriləcəyi ünvan"
                error={!!errors.address}
                disabled={isSubmitting}
                {...register('address')}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={`booking-notes-${service.id}`}>Qeyd (istəyə bağlı)</Label>
            <Textarea
              id={`booking-notes-${service.id}`}
              rows={3}
              placeholder="Xidmət verənə əlavə məlumat yazın"
              disabled={isSubmitting}
              {...register('notes')}
            />
          </div>

          {errors.root && (
            <div
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {errors.root.message}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border/60 px-5 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Ləğv et
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Göndərilir...
              </>
            ) : (
              <>
                Sifarişi təsdiqlə
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
