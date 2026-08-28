'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Camera, Loader2, Radio, Trash2, X } from 'lucide-react';
import {
  BAKU_CITY,
  BookingType,
  ProviderAvailability,
  UserRole,
  isCompleteBookingLocation,
  locationsServeSameCity,
  toDisplayMediaUrl,
  type CategorySummary,
  type ServiceSummary,
} from '@xidmetal/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LocationPicker } from '@/components/ui/location-picker';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError, uploadImage } from '@/lib/api';
import { getServiceTypesForCategory } from '@/lib/service-types';
import { composeBookingAddress } from '@/lib/booking-address';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

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
      .max(1000, 'Qeyd maksimum 1000 simvol ola bilər'),
    serviceLocation: z
      .string()
      .trim()
      .min(1, 'Şəhər və ya rayon seçin')
      .refine(
        (value) => isCompleteBookingLocation(value),
        (value) => ({
          message:
            value.trim() === BAKU_CITY ? 'Bakı rayonu seçin' : 'Şəhər və ya rayon seçin',
        }),
      ),
    address: z
      .string()
      .trim()
      .min(1, 'Ünvan daxil edin')
      .max(500, 'Ünvan maksimum 500 simvol ola bilər'),
    addressBlock: z.string().trim().max(30, 'Blok maksimum 30 simvol ola bilər').optional(),
    addressFloor: z.string().trim().max(20, 'Mərtəbə maksimum 20 simvol ola bilər').optional(),
    addressDoor: z.string().trim().max(30, 'Qapı maksimum 30 simvol ola bilər').optional(),
  })
  .superRefine((data, ctx) => {
    const composed = composeBookingAddress({
      street: data.address,
      block: data.addressBlock,
      floor: data.addressFloor,
      door: data.addressDoor,
      location: data.serviceLocation,
    });
    if (composed.length > 500) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ünvan və detallar birlikdə maksimum 500 simvol ola bilər',
        path: ['address'],
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
    serviceLocation: string;
    minRating: number | null;
    minPrice: number | null;
    maxPrice: number | null;
  },
): boolean {
  if (service.title !== filters.serviceType) return false;
  if (
    !service.location ||
    !locationsServeSameCity(service.location, filters.serviceLocation)
  ) {
    return false;
  }
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
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const idempotencyKeyRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | undefined>();
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

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
      serviceLocation: '',
      address: '',
      addressBlock: '',
      addressFloor: '',
      addressDoor: '',
    },
  });

  const categoryId = watch('categoryId');
  const serviceType = watch('serviceType');
  const serviceLocation = watch('serviceLocation');
  const locationReady = isCompleteBookingLocation(serviceLocation ?? '');

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
    queryKey: ['urgent-order-services', categoryId, serviceType, serviceLocation],
    queryFn: async () => {
      const page = await api.services({
        categoryId,
        page: '1',
        limit: '50',
        ...(serviceType ? { title: serviceType } : {}),
        ...(serviceLocation && isCompleteBookingLocation(serviceLocation)
          ? { location: serviceLocation }
          : {}),
      });
      return page.items;
    },
    enabled: open && !!categoryId && !!serviceType,
  });

  const minRatingValue = watch('minRating');
  const minPriceValue = watch('minPrice');
  const maxPriceValue = watch('maxPrice');

  const matchedServices = useMemo(() => {
    const services = servicesQuery.data ?? [];
    if (!serviceType || !locationReady) return [] as ServiceSummary[];
    const minRating = parseOptionalRating(minRatingValue);
    const minPrice = parseOptionalPrice(minPriceValue);
    const maxPrice = parseOptionalPrice(maxPriceValue);
    return services.filter((s) =>
      matchesFilters(s, {
        serviceType,
        serviceLocation,
        minRating,
        minPrice,
        maxPrice,
      }),
    );
  }, [
    servicesQuery.data,
    serviceType,
    serviceLocation,
    locationReady,
    minRatingValue,
    minPriceValue,
    maxPriceValue,
  ]);

  const matchingCount = matchedServices.length;

  const onlineFromServices = useMemo(() => {
    const ids = new Set<string>();
    for (const service of matchedServices) {
      if (service.providerAvailability === ProviderAvailability.ONLINE) {
        ids.add(service.providerId);
      }
    }
    return ids.size;
  }, [matchedServices]);

  const minRatingParsed = parseOptionalRating(minRatingValue);
  const minPriceParsed = parseOptionalPrice(minPriceValue);
  const maxPriceParsed = parseOptionalPrice(maxPriceValue);

  const onlineCountQuery = useQuery({
    queryKey: [
      'urgent-order-online-count',
      categoryId,
      serviceType,
      serviceLocation,
      minRatingParsed,
      minPriceParsed,
      maxPriceParsed,
    ],
    queryFn: () => {
      if (!locationReady) {
        return Promise.resolve({ count: 0 });
      }
      return api.geo.onlineCount({
        categoryId,
        serviceTitle: serviceType,
        serviceLocation,
        ...(minRatingParsed !== null ? { minRating: minRatingParsed } : {}),
        ...(minPriceParsed !== null ? { minPrice: minPriceParsed } : {}),
        ...(maxPriceParsed !== null ? { maxPrice: maxPriceParsed } : {}),
      });
    },
    enabled: open && !!categoryId && !!serviceType && locationReady,
    refetchInterval: 15_000,
    retry: 2,
    refetchOnMount: 'always',
  });

  /** API əsas mənbə; uğursuz olsa xidmət siyahısından ehtiyat say */
  const onlineProviderCount =
    onlineCountQuery.data?.count ??
    (servicesQuery.isSuccess ? onlineFromServices : null);

  useEffect(() => {
    if (!open) return;
    reset({
      categoryId: '',
      serviceType: '',
      minRating: '',
      maxPrice: '',
      minPrice: '',
      notes: '',
      serviceLocation: '',
      address: '',
      addressBlock: '',
      addressFloor: '',
      addressDoor: '',
    });
    idempotencyKeyRef.current = null;
    setImagePreview(undefined);
    setImageError(null);
    setImageUploading(false);
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

      const minRating = parseOptionalRating(values.minRating);
      const minPrice = parseOptionalPrice(values.minPrice);
      const maxPrice = parseOptionalPrice(values.maxPrice);
      const resolvedLocation = values.serviceLocation.trim();
      if (!isCompleteBookingLocation(resolvedLocation)) {
        throw new Error(
          resolvedLocation === BAKU_CITY
            ? 'Bakı rayonu seçin'
            : 'Şəhər və ya rayon seçin',
        );
      }
      const listing = await queryClient.fetchQuery({
        queryKey: [
          'urgent-order-services',
          values.categoryId,
          values.serviceType,
          resolvedLocation,
        ],
        queryFn: async () => {
          const page = await api.services({
            categoryId: values.categoryId,
            page: '1',
            limit: '50',
            title: values.serviceType,
            location: resolvedLocation,
          });
          return page.items;
        },
      });
      const matched = listing.filter((s) =>
        matchesFilters(s, {
          serviceType: values.serviceType,
          serviceLocation: resolvedLocation,
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

      return api.createBooking(
        token,
        {
          serviceId: seed.id,
          notes: values.notes.trim() || undefined,
          imageUrl: imagePreview,
          address: composeBookingAddress({
            street: values.address,
            block: values.addressBlock,
            floor: values.addressFloor,
            door: values.addressDoor,
            location: resolvedLocation,
          }),
          serviceLocation: resolvedLocation,
          type: BookingType.INSTANT,
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
  const canSubmit =
    !isSubmitting &&
    !imageUploading &&
    !(!!categoryId && !!serviceType && locationReady && servicesQuery.isPending);

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    const token = useAuthStore.getState().session ? 'session' : null;
    if (!token) {
      setImageError('Şəkil yükləmək üçün daxil olun');
      return;
    }

    setImageUploading(true);
    try {
      const url = await uploadImage(token, file, 'bookings');
      setImagePreview(url);
    } catch (error) {
      setImageError(error instanceof ApiError ? error.message : 'Şəkil yüklənmədi');
    } finally {
      setImageUploading(false);
    }
  };

  const handleImageRemove = () => {
    setImagePreview(undefined);
    setImageError(null);
  };

  const onSubmit = (values: UrgentOrderFormValues) => {
    clearErrors('root');
    createMutation.mutate(values);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Təcili sifariş"
      description="Kateqoriya, xidmət növü və meyarları seçib təcili sifariş yaradın"
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
            <Label htmlFor="urgent-location">Şəhər və ya rayon</Label>
            <LocationPicker
              id="urgent-location"
              value={serviceLocation ?? ''}
              onChange={(next) =>
                setValue('serviceLocation', next, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              disabled={isSubmitting}
              error={!!errors.serviceLocation}
              clearable={false}
              requireBakuDistrict
            />
            {errors.serviceLocation ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.serviceLocation.message}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Bakı seçəndə inzibati rayon da seçilməlidir, sonra küçə ünvanını yazın.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="urgent-address">Ünvan</Label>
            <Input
              id="urgent-address"
              placeholder={
                locationReady
                  ? 'məs. Nizami küçəsi 12'
                  : 'Əvvəlcə şəhər və ya rayon seçin'
              }
              disabled={isSubmitting || !locationReady}
              error={!!errors.address}
              {...register('address')}
            />
            {errors.address ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.address.message}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="urgent-address-block">Blok</Label>
              <Input
                id="urgent-address-block"
                placeholder="məs. 5"
                disabled={isSubmitting || !locationReady}
                error={!!errors.addressBlock}
                autoComplete="off"
                {...register('addressBlock')}
              />
              {errors.addressBlock ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.addressBlock.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgent-address-floor">Mərtəbə</Label>
              <Input
                id="urgent-address-floor"
                placeholder="məs. 3"
                disabled={isSubmitting || !locationReady}
                error={!!errors.addressFloor}
                autoComplete="off"
                inputMode="numeric"
                {...register('addressFloor')}
              />
              {errors.addressFloor ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.addressFloor.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgent-address-door">Qapı</Label>
              <Input
                id="urgent-address-door"
                placeholder="məs. 14"
                disabled={isSubmitting || !locationReady}
                error={!!errors.addressDoor}
                autoComplete="off"
                {...register('addressDoor')}
              />
              {errors.addressDoor ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.addressDoor.message}
                </p>
              ) : null}
            </div>
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

          <div className="space-y-2">
            <Label htmlFor="urgent-notes">Qeyd (istəyə bağlı)</Label>
            <Textarea
              id="urgent-notes"
              placeholder="Xidmət verənə əlavə məlumat yazın"
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
            <Label htmlFor="urgent-image">İşin şəkli (istəyə bağlı)</Label>
            <p className="text-sm text-muted-foreground">
              Görüləcək işi göstərən şəkil əlavə edin. JPG, PNG və ya WEBP, maksimum 1 MB.
            </p>
            <input
              ref={fileInputRef}
              id="urgent-image"
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              className="hidden"
              disabled={isSubmitting || imageUploading}
              onChange={(event) => void handleImageSelect(event)}
            />
            {imagePreview ? (
              <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={toDisplayMediaUrl(imagePreview)}
                  alt="Görüləcək işin şəkli"
                  className="max-h-48 w-full object-contain"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="absolute right-2 top-2 min-h-[44px] bg-background/90"
                  disabled={isSubmitting || imageUploading}
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
                disabled={isSubmitting || imageUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {imageUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Yüklənir…
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    Şəkil əlavə et
                  </>
                )}
              </Button>
            )}
            {imageError ? (
              <p className="text-sm text-destructive" role="alert">
                {imageError}
              </p>
            ) : null}
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
          <UrgentOnlineStatus
            ready={!!categoryId && !!serviceType && locationReady}
            loading={
              (onlineCountQuery.isPending && !servicesQuery.isSuccess) ||
              (servicesQuery.isPending && onlineProviderCount == null)
            }
            onlineCount={onlineProviderCount}
            matchingCount={matchingCount}
          />
          <Button
            type="submit"
            size="lg"
            disabled={!canSubmit}
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

type UrgentOnlineStatusProps = {
  ready: boolean;
  loading: boolean;
  onlineCount: number | null;
  matchingCount: number;
};

function UrgentOnlineStatus({
  ready,
  loading,
  onlineCount,
  matchingCount,
}: UrgentOnlineStatusProps) {
  if (!ready) {
    return (
      <p className="text-xs text-muted-foreground sm:text-sm">
        Meyarlara uyğun xidmət seçin
      </p>
    );
  }

  if (loading) {
    return (
      <div
        className="inline-flex max-w-full items-center gap-2.5 rounded-xl border border-border/70 bg-muted/30 px-3 py-2"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Yoxlanılır…</p>
          <p className="text-xs text-muted-foreground">Onlayn xidmət verənlər</p>
        </div>
      </div>
    );
  }

  const count = onlineCount ?? 0;
  const hasOnline = count > 0;
  const noMatch = matchingCount === 0;

  return (
    <div
      className={cn(
        'inline-flex max-w-full items-center gap-2.5 rounded-xl border px-3 py-2',
        hasOnline && 'border-emerald-500/25 bg-emerald-500/[0.06]',
        !hasOnline && !noMatch && 'border-amber-500/25 bg-amber-500/[0.06]',
        noMatch && 'border-border/70 bg-muted/30',
      )}
      aria-live="polite"
    >
      <span
        className={cn(
          'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          hasOnline && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
          !hasOnline && !noMatch && 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
          noMatch && 'bg-muted text-muted-foreground',
        )}
        aria-hidden
      >
        {hasOnline ? (
          <>
            <span className="absolute inset-1 animate-ping rounded-md bg-emerald-500/20" />
            <Radio className="relative h-3.5 w-3.5" />
          </>
        ) : (
          <Radio className="h-3.5 w-3.5 opacity-60" />
        )}
      </span>

      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm leading-tight">
          <span
            className={cn(
              'tabular-nums text-base font-semibold tracking-tight',
              hasOnline && 'text-emerald-700 dark:text-emerald-400',
              !hasOnline && !noMatch && 'text-amber-800 dark:text-amber-400',
              noMatch && 'text-foreground',
            )}
          >
            {count}
          </span>
          <span className="font-medium text-foreground">onlayn</span>
        </p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          {hasOnline
            ? 'Təklif bu ərazidəki onlayn xidmət verənlərə gedəcək'
            : noMatch
              ? 'Seçilmiş meyarlara uyğun xidmət yoxdur'
              : 'Hazırda onlayn yoxdur — bir az sonra yenidən yoxlayın'}
        </p>
      </div>
    </div>
  );
}
