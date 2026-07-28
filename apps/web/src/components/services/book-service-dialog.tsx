'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, Camera, Loader2, Trash2, X } from 'lucide-react';
import {
  AvailabilitySlotStatus,
  UserRole,
  type ServiceSummary,
} from '@xidmetal/shared';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { TimePicker, type TimePickerOption } from '@/components/ui/time-picker';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn, combineDateAndTime, formatPrice, formatTimeInBaku } from '@/lib/utils';
import { getPriceUnitLabel } from '@/lib/provider-labels';

type ActivePicker = 'date' | 'time' | null;

const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

function createBookServiceFormSchema(requireAddress: boolean) {
  return z.object({
    date: z.string().min(1, 'Tarix seçin'),
    time: z.string().min(1, 'Saat seçin'),
    notes: z.string().trim().min(1, 'Qeyd yazın').max(1000, 'Qeyd maksimum 1000 simvol ola bilər'),
    address: requireAddress
      ? z.string().trim().min(1, 'Ünvan daxil edin').max(500, 'Ünvan maksimum 500 simvol ola bilər')
      : z.string().max(500).optional(),
  });
}

type BookServiceFormValues = z.infer<ReturnType<typeof createBookServiceFormSchema>>;

interface BookServiceDialogProps {
  service: ServiceSummary;
  open: boolean;
  onClose: () => void;
}

export function BookServiceDialog({ service, open, onClose }: BookServiceDialogProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | undefined>();
  const [imageError, setImageError] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const requireAddress = !service.isRemote;
  const bookServiceFormSchema = useMemo(
    () => createBookServiceFormSchema(requireAddress),
    [requireAddress],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<BookServiceFormValues>({
    resolver: zodResolver(bookServiceFormSchema),
    defaultValues: {
      date: '',
      time: '',
      notes: '',
      address: '',
    },
  });

  const selectedDate = watch('date');
  const selectedTime = watch('time');
  const today = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const availabilityQuery = useQuery({
    queryKey: ['service-availability', service.id, selectedDate],
    queryFn: () => api.getServiceAvailability(service.id, selectedDate, selectedDate),
    enabled: open && !!selectedDate,
  });

  const dayAvailability = availabilityQuery.data?.[0];
  const hasCalendar = dayAvailability?.hasCalendar ?? false;

  const timeOptions: TimePickerOption[] = useMemo(() => {
    if (!dayAvailability) return [];
    const now = Date.now();
    return dayAvailability.slots.map((slot) => {
      const startMs = new Date(slot.start).getTime();
      const isPast = startMs <= now;
      const isBusy = slot.status === AvailabilitySlotStatus.BUSY;
      return {
        value: formatTimeInBaku(slot.start),
        label: formatTimeInBaku(slot.start),
        disabled: isBusy || isPast,
        hint: isBusy ? 'Dolu' : isPast ? 'Keçib' : undefined,
      };
    });
  }, [dayAvailability]);

  const freeTimeValues = useMemo(
    () => new Set(timeOptions.filter((opt) => !opt.disabled).map((opt) => opt.value)),
    [timeOptions],
  );

  useEffect(() => {
    if (!open) return;
    reset({
      date: '',
      time: '',
      notes: '',
      address: '',
    });
    setImagePreview(undefined);
    setImageError(null);
    setActivePicker(null);
    clearErrors();
  }, [open, reset, clearErrors, service.id]);

  useEffect(() => {
    setValue('time', '');
  }, [selectedDate, setValue]);

  useEffect(() => {
    if (!selectedTime) return;
    if (!freeTimeValues.has(selectedTime)) {
      setValue('time', '');
    }
  }, [selectedTime, freeTimeValues, setValue]);

  const createMutation = useMutation({
    mutationFn: async (values: BookServiceFormValues) => {
      const token = useAuthStore.getState().tokens?.accessToken;
      if (!token) throw new Error('Autentifikasiya tələb olunur');

      if (!hasCalendar) {
        throw new Error('Provider hələ təqvim təyin etməyib');
      }

      const scheduledAt = combineDateAndTime(values.date, values.time);
      if (new Date(scheduledAt) <= new Date()) {
        throw new Error('Sifariş tarixi gələcəkdə olmalıdır');
      }

      return api.createBooking(token, {
        serviceId: service.id,
        scheduledAt,
        notes: values.notes.trim(),
        address: values.address?.trim() || undefined,
        imageUrl: imagePreview,
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

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImageError(null);

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      setImageError('Yalnız JPG, PNG və ya WEBP formatı qəbul edilir');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError('Şəkil maksimum 1 MB ola bilər');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImagePreview(reader.result);
      }
    };
    reader.onerror = () => setImageError('Şəkil oxunarkən xəta baş verdi');
    reader.readAsDataURL(file);
  };

  const handleImageRemove = () => {
    setImagePreview(undefined);
    setImageError(null);
  };

  const onSubmit = (values: BookServiceFormValues) => {
    clearErrors('root');
    createMutation.mutate(values);
  };

  const calendarBlocked = Boolean(selectedDate && dayAvailability && !hasCalendar);
  const noFreeSlots = Boolean(
    selectedDate && dayAvailability && hasCalendar && freeTimeValues.size === 0,
  );

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
            {service.price > 0
              ? `${formatPrice(service.price)} / ${getPriceUnitLabel(service.priceUnit)}`
              : formatPrice(service.price)}
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
            <div className={cn('space-y-2', activePicker === 'date' && 'sm:col-span-2')}>
              <Label htmlFor={`booking-date-${service.id}`}>Tarix</Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    id={`booking-date-${service.id}`}
                    value={field.value}
                    min={today}
                    error={!!errors.date}
                    disabled={isSubmitting}
                    open={activePicker === 'date'}
                    onOpenChange={(nextOpen) => setActivePicker(nextOpen ? 'date' : null)}
                    onChange={(nextDate) => {
                      field.onChange(nextDate);
                      setActivePicker('time');
                    }}
                  />
                )}
              />
              {errors.date && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.date.message}
                </p>
              )}
            </div>
            <div className={cn('space-y-2', activePicker === 'time' && 'sm:col-span-2')}>
              <Label htmlFor={`booking-time-${service.id}`}>Saat</Label>
              <Controller
                name="time"
                control={control}
                render={({ field }) => (
                  <TimePicker
                    id={`booking-time-${service.id}`}
                    value={field.value}
                    error={!!errors.time}
                    disabled={
                      isSubmitting ||
                      !selectedDate ||
                      availabilityQuery.isLoading ||
                      calendarBlocked
                    }
                    open={activePicker === 'time'}
                    onOpenChange={(nextOpen) => setActivePicker(nextOpen ? 'time' : null)}
                    onChange={field.onChange}
                    options={selectedDate ? timeOptions : undefined}
                    helperText={
                      availabilityQuery.isLoading
                        ? 'Vaxtlar yüklənir...'
                        : calendarBlocked
                          ? 'Təqvim təyin olunmayıb'
                          : 'Boş və dolu vaxtlar'
                    }
                    emptyMessage={
                      calendarBlocked
                        ? 'Provider hələ təqvim təyin etməyib'
                        : 'Bu tarixdə boş vaxt yoxdur'
                    }
                  />
                )}
              />
              {errors.time && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.time.message}
                </p>
              )}
              {calendarBlocked && (
                <p className="text-sm text-destructive" role="alert">
                  Provider hələ təqvim təyin etməyib
                </p>
              )}
              {noFreeSlots && (
                <p className="text-sm text-muted-foreground">Bu tarixdə boş vaxt yoxdur</p>
              )}
            </div>
          </div>

          {requireAddress && (
            <div className="space-y-2">
              <Label htmlFor={`booking-address-${service.id}`}>Ünvan</Label>
              <Input
                id={`booking-address-${service.id}`}
                placeholder="Xidmətin göstəriləcəyi ünvan"
                error={!!errors.address}
                disabled={isSubmitting}
                {...register('address')}
              />
              {errors.address && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.address.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={`booking-notes-${service.id}`}>Qeyd</Label>
            <Textarea
              id={`booking-notes-${service.id}`}
              rows={3}
              placeholder="Xidmət verənə əlavə məlumat yazın"
              error={!!errors.notes}
              disabled={isSubmitting}
              {...register('notes')}
            />
            {errors.notes && (
              <p className="text-sm text-destructive" role="alert">
                {errors.notes.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>İşin şəkli (istəyə bağlı)</Label>
            <p className="text-sm text-muted-foreground">
              Görüləcək işi göstərən şəkil əlavə edin. JPG, PNG və ya WEBP, maksimum 1 MB.
            </p>
            <input
              ref={fileInputRef}
              id={`booking-image-${service.id}`}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              className="hidden"
              disabled={isSubmitting}
              onChange={handleImageSelect}
            />
            {imagePreview ? (
              <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Görüləcək işin şəkli"
                  className="max-h-48 w-full object-contain"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="absolute right-2 top-2 min-h-[44px] bg-background/90"
                  disabled={isSubmitting}
                  onClick={handleImageRemove}
                >
                  <Trash2 className="h-4 w-4" />
                  Sil
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px] w-full sm:w-auto"
                disabled={isSubmitting}
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
                Şəkil əlavə et
              </Button>
            )}
            {imageError && (
              <p className="text-sm text-destructive" role="alert">
                {imageError}
              </p>
            )}
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
          <Button
            type="submit"
            disabled={isSubmitting || calendarBlocked || noFreeSlots || availabilityQuery.isLoading}
          >
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
