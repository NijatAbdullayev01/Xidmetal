'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, X } from 'lucide-react';
import {
  BookingType,
  UserRole,
  type CategorySummary,
  type ServiceSummary,
} from '@xidmetal/shared';
import { LocationMapPicker } from '@/components/geo/location-map-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';
import { getServiceTypesForCategory } from '@/lib/service-types';
import { formatPrice, cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? '';

const RATING_OPTIONS = [
  { value: '', label: 'Fərq etməz' },
  { value: '4', label: '4 və yuxarı' },
  { value: '3', label: '3 və yuxarı' },
  { value: '2', label: '2 və yuxarı' },
] as const;

const urgentOrderSchema = z
  .object({
    categoryId: z.string().uuid('Kateqoriya seçin'),
    serviceType: z.string().trim().min(1, 'Xidmət növü seçin'),
    minRating: z.string().optional(),
    minPrice: z.string().optional(),
    maxPrice: z.string().optional(),
    notes: z
      .string()
      .trim()
      .min(1, 'Qeyd yazın')
      .max(1000, 'Qeyd maksimum 1000 simvol ola bilər'),
    address: z
      .string()
      .trim()
      .min(1, 'Ünvan daxil edin')
      .max(500, 'Ünvan maksimum 500 simvol ola bilər'),
    destLat: z.string().optional(),
    destLng: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const lat = data.destLat?.trim() ? Number(data.destLat) : NaN;
    const lng = data.destLng?.trim() ? Number(data.destLng) : NaN;
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Xəritədə mövqe seçin və ya yerinizi göndərin',
        path: ['destLat'],
      });
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Xəritədə mövqe seçin və ya yerinizi göndərin',
        path: ['destLng'],
      });
    }

    const minPrice = parseOptionalPrice(data.minPrice);
    const maxPrice = parseOptionalPrice(data.maxPrice);
    if (data.minPrice?.trim() && minPrice === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimum qiymət etibarsızdır',
        path: ['minPrice'],
      });
    }
    if (data.maxPrice?.trim() && maxPrice === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Maksimum qiymət etibarsızdır',
        path: ['maxPrice'],
      });
    }
    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimum qiymət maksimumdan böyük ola bilməz',
        path: ['maxPrice'],
      });
    }
  });

type UrgentOrderFormValues = z.infer<typeof urgentOrderSchema>;

function parseOptionalPrice(value: string | undefined): number | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function parseOptionalRating(value: string | undefined): number | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 5) return null;
  return parsed;
}

function matchesFilters(
  service: ServiceSummary,
  filters: {
    serviceType: string;
    minRating: number | null;
    minPrice: number | null;
    maxPrice: number | null;
  },
): boolean {
  if (service.title !== filters.serviceType) return false;
  if (filters.minRating !== null && service.averageRating < filters.minRating) {
    return false;
  }
  if (filters.minPrice !== null && service.price < filters.minPrice) return false;
  if (filters.maxPrice !== null && service.price > filters.maxPrice) return false;
  return true;
}

/** Qiymətə görə orta seçim — seed serviceId üçün */
function pickSeedService(services: ServiceSummary[]): ServiceSummary | null {
  if (services.length === 0) return null;
  const sorted = [...services].sort((a, b) => a.price - b.price);
  return sorted[Math.floor(sorted.length / 2)] ?? sorted[0] ?? null;
}

interface UrgentOrderDialogProps {
  open: boolean;
  onClose: () => void;
  initialCategories?: CategorySummary[];
}

export function UrgentOrderDialog({
  open,
  onClose,
  initialCategories,
}: UrgentOrderDialogProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const idempotencyKeyRef = useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<UrgentOrderFormValues>({
    resolver: zodResolver(urgentOrderSchema),
    defaultValues: {
      categoryId: '',
      serviceType: '',
      minRating: '',
      minPrice: '',
      maxPrice: '',
      notes: '',
      address: '',
      destLat: '',
      destLng: '',
    },
  });

  const categoryId = watch('categoryId');
  const serviceType = watch('serviceType');
  const destLat = watch('destLat');
  const destLng = watch('destLng');

  const categoriesQuery = useQuery({
    queryKey: ['urgent-order-categories'],
    queryFn: () => api.categories(),
    enabled: open,
    ...(initialCategories?.length
      ? { initialData: initialCategories }
      : {}),
  });

  const categories = categoriesQuery.data ?? initialCategories ?? [];
  const selectedCategory = categories.find((c) => c.id === categoryId);

  const serviceTypes = useMemo(() => {
    if (!selectedCategory) return [] as string[];
    const predefined = getServiceTypesForCategory(selectedCategory.slug);
    return predefined ? [...predefined] : [];
  }, [selectedCategory]);

  const servicesQuery = useQuery({
    queryKey: ['urgent-order-services', categoryId],
    queryFn: async () => {
      const page = await api.services({
        categoryId,
        page: '1',
        limit: '100',
      });
      return page.items;
    },
    enabled: open && !!categoryId,
  });

  const minRatingValue = watch('minRating');
  const minPriceValue = watch('minPrice');
  const maxPriceValue = watch('maxPrice');

  const matchedServices = useMemo(() => {
    const services = servicesQuery.data ?? [];
    if (!serviceType) return [] as ServiceSummary[];
    const minRating = parseOptionalRating(minRatingValue);
    const minPrice = parseOptionalPrice(minPriceValue);
    const maxPrice = parseOptionalPrice(maxPriceValue);
    return services.filter((s) =>
      matchesFilters(s, { serviceType, minRating, minPrice, maxPrice }),
    );
  }, [
    servicesQuery.data,
    serviceType,
    minRatingValue,
    minPriceValue,
    maxPriceValue,
  ]);

  const matchingCount = matchedServices.length;
  const seedPreview = pickSeedService(matchedServices);

  useEffect(() => {
    if (!open) return;
    reset({
      categoryId: '',
      serviceType: '',
      minRating: '',
      maxPrice: '',
      minPrice: '',
      notes: '',
      address: '',
      destLat: '',
      destLng: '',
    });
    idempotencyKeyRef.current = null;
    clearErrors();
  }, [open, reset, clearErrors]);

  useEffect(() => {
    setValue('serviceType', '', { shouldValidate: false });
  }, [categoryId, setValue]);

  const createMutation = useMutation({
    mutationFn: async (values: UrgentOrderFormValues) => {
      const token = useAuthStore.getState().session ? 'session' : null;
      if (!token) throw new Error('Autentifikasiya tələb olunur');

      if (user?.role !== UserRole.CUSTOMER) {
        throw new Error('Təcili sifariş yalnız müştəri hesabı ilə mümkündür');
      }
      if (!user.isVerified) {
        throw new Error('Sifariş vermək üçün e-poçtunuzu təsdiqləyin');
      }

      const services = servicesQuery.data ?? [];
      const minRating = parseOptionalRating(values.minRating);
      const minPrice = parseOptionalPrice(values.minPrice);
      const maxPrice = parseOptionalPrice(values.maxPrice);
      const matched = services.filter((s) =>
        matchesFilters(s, {
          serviceType: values.serviceType,
          minRating,
          minPrice,
          maxPrice,
        }),
      );
      const seed = pickSeedService(matched);
      if (!seed) {
        throw new Error(
          'Seçilmiş meyarlara uyğun aktiv xidmət tapılmadı. Filtrləri dəyişin.',
        );
      }

      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `urgent-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      }

      const destLatNum = Number(values.destLat);
      const destLngNum = Number(values.destLng);

      return api.createBooking(
        token,
        {
          serviceId: seed.id,
          notes: values.notes.trim(),
          address: values.address.trim(),
          type: BookingType.INSTANT,
          destLat: destLatNum,
          destLng: destLngNum,
          originLat: destLatNum,
          originLng: destLngNum,
          ...(minRating !== null ? { minRating } : {}),
          ...(minPrice !== null ? { minPrice } : {}),
          ...(maxPrice !== null ? { maxPrice } : {}),
        },
        { idempotencyKey: idempotencyKeyRef.current },
      );
    },
    onSuccess: (booking) => {
      onClose();
      const qs = booking?.id ? `?highlight=${encodeURIComponent(booking.id)}` : '';
      router.push(`/dashboard/customer/bookings${qs}`);
    },
    onError: (error) => {
      setError('root', {
        message:
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Sifariş yaradılmadı',
      });
    },
  });

  const isSubmitting = createMutation.isPending;

  const onSubmit = (values: UrgentOrderFormValues) => {
    clearErrors('root');
    createMutation.mutate(values);
  };

  const latNum = destLat?.trim() ? Number(destLat) : null;
  const lngNum = destLng?.trim() ? Number(destLng) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Təcili sifariş"
      description="Kateqoriya, xidmət növü və meyarları seçib ani sifariş yaradın"
      panelClassName="max-w-xl max-h-[min(94dvh,820px)]"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">Təcili sifariş</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Uyğun aktiv xidmət verənlərin hamısına eyni anda təklif göndərilir.
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
          <div className="space-y-2">
            <Label htmlFor="urgent-category">Kateqoriya</Label>
            <Select
              id="urgent-category"
              value={categoryId}
              onChange={(next) =>
                setValue('categoryId', next, { shouldValidate: true, shouldDirty: true })
              }
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Kateqoriya seçin"
              searchable={categories.length > 5}
              searchPlaceholder="Kateqoriya axtarın..."
              disabled={isSubmitting || categoriesQuery.isLoading}
              error={!!errors.categoryId}
            />
            {errors.categoryId ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.categoryId.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="urgent-service-type">Xidmət növü</Label>
            <Select
              id="urgent-service-type"
              value={serviceType}
              onChange={(next) =>
                setValue('serviceType', next, { shouldValidate: true, shouldDirty: true })
              }
              options={serviceTypes.map((type) => ({ value: type, label: type }))}
              placeholder={
                categoryId ? 'Xidmət növü seçin' : 'Əvvəlcə kateqoriya seçin'
              }
              searchable={serviceTypes.length > 8}
              disabled={isSubmitting || !categoryId || serviceTypes.length === 0}
              error={!!errors.serviceType}
            />
            {errors.serviceType ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.serviceType.message}
              </p>
            ) : null}
            {categoryId && serviceTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Bu kateqoriya üçün əvvəlcədən təyin olunmuş xidmət növü yoxdur.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="urgent-rating">Minimum reytinq</Label>
            <Select
              id="urgent-rating"
              value={watch('minRating') ?? ''}
              onChange={(next) =>
                setValue('minRating', next, { shouldValidate: true, shouldDirty: true })
              }
              options={[...RATING_OPTIONS]}
              placeholder="Reytinq"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="urgent-min-price">Min. qiymət (AZN)</Label>
              <Input
                id="urgent-min-price"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="0"
                disabled={isSubmitting}
                error={!!errors.minPrice}
                {...register('minPrice')}
              />
              {errors.minPrice ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.minPrice.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgent-max-price">Maks. qiymət (AZN)</Label>
              <Input
                id="urgent-max-price"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="Məs. 50"
                disabled={isSubmitting}
                error={!!errors.maxPrice}
                {...register('maxPrice')}
              />
              {errors.maxPrice ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.maxPrice.message}
                </p>
              ) : null}
            </div>
          </div>

          {categoryId && serviceType && !servicesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              {matchingCount > 0
                ? `${matchingCount} uyğun xidmət — təklif yaxınlıqdakı aktiv xidmət verənlərə gedəcək.`
                : 'Seçilmiş meyarlara uyğun xidmət yoxdur.'}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="urgent-notes">Qeyd</Label>
            <Textarea
              id="urgent-notes"
              placeholder="Nə lazımdır, təciliilik və digər detallar…"
              disabled={isSubmitting}
              error={!!errors.notes}
              {...register('notes')}
            />
            {errors.notes ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.notes.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="urgent-address">Ünvan</Label>
            <Input
              id="urgent-address"
              placeholder="Küçə, bina, mənzil"
              disabled={isSubmitting}
              error={!!errors.address}
              {...register('address')}
            />
            {errors.address ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.address.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Mövqe</Label>
            {MAPBOX_TOKEN ? (
              <LocationMapPicker
                lat={Number.isFinite(latNum) ? latNum : null}
                lng={Number.isFinite(lngNum) ? lngNum : null}
                disabled={isSubmitting}
                onChange={({ lat, lng, address }) => {
                  setValue('destLat', String(lat), {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                  setValue('destLng', String(lng), {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                  if (address?.trim()) {
                    setValue('address', address.trim(), {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }
                }}
              />
            ) : (
              <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Xəritə üçün Mapbox token təyin olunmayıb. Koordinatları əl ilə daxil etmək
                mümkün deyil — administratorla əlaqə saxlayın.
              </p>
            )}
            {(errors.destLat || errors.destLng) && (
              <p className="text-sm text-destructive" role="alert">
                {errors.destLat?.message ?? errors.destLng?.message}
              </p>
            )}
          </div>

          {errors.root ? (
            <p
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {errors.root.message}
            </p>
          ) : null}
        </div>

        <div
          className={cn(
            'flex flex-col gap-3 border-t border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between',
          )}
        >
          <p className="text-xs text-muted-foreground sm:text-sm">
            {seedPreview
              ? `Nümunə qiymət: ~${formatPrice(seedPreview.price)}`
              : 'Meyarlara uyğun xidmət seçin'}
          </p>
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || matchingCount === 0}
            className="w-full min-h-11 sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Göndərilir…
              </>
            ) : (
              'Sifarişi yarat'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
