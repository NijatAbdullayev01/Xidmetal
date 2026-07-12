'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createServiceSchema, PRICE_UNIT_VALUES, PriceUnit, ServiceVenue, requiresServiceVenue } from '@xidmetal/shared';
import { z } from 'zod';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonStyles } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useAuthStore } from '@/store/auth.store';
import { PRICE_UNIT_LABELS, getPriceUnitsForCategorySlug } from '@/lib/provider-labels';
import { formatPrice } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { getServiceTypesForCategory } from '@/lib/service-types';
import { ServiceVenueSelector } from '@/components/services/service-venue-selector';
import { useAuthHydrated } from '@/hooks/use-auth-hydrated';

const editServiceFormSchema = createServiceSchema.extend({
  priceUnit: z.enum(PRICE_UNIT_VALUES),
  isRemote: z.boolean(),
  serviceVenue: z.nativeEnum(ServiceVenue).optional(),
});

type EditServiceFormValues = z.infer<typeof editServiceFormSchema>;

interface EditServiceFormProps {
  serviceId: string;
}

export function EditServiceForm({ serviceId }: EditServiceFormProps) {
  const router = useRouter();
  const token = useAuthToken();
  const userId = useAuthStore((state) => state.user?.id);
  const hydrated = useAuthHydrated();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    data: service,
    isLoading,
    error: loadError,
  } = useQuery({
    queryKey: ['services', serviceId],
    queryFn: () => api.service(serviceId, token ?? undefined),
  });
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories(),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditServiceFormValues>({
    resolver: zodResolver(editServiceFormSchema),
    defaultValues: {
      title: '',
      description: '',
      categoryId: '',
      price: 0,
      priceUnit: PriceUnit.FIXED,
      location: '',
      isRemote: false,
      serviceVenue: undefined,
    },
  });

  useEffect(() => {
    if (!service) return;

    reset({
      title: service.title,
      description: service.description,
      categoryId: service.categoryId,
      price: service.price,
      priceUnit: service.priceUnit as EditServiceFormValues['priceUnit'],
      location: service.location ?? '',
      isRemote: service.isRemote,
      serviceVenue: service.serviceVenue as EditServiceFormValues['serviceVenue'],
    });
  }, [service, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: EditServiceFormValues) => {
      if (!token) throw new ApiError('Autentifikasiya tələb olunur', 401);
      const category = categories.find((cat) => cat.id === data.categoryId);
      return api.updateService(token, serviceId, {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        price: Number(data.price),
        priceUnit: data.priceUnit,
        location: data.location?.trim() || undefined,
        isRemote: data.isRemote,
        serviceVenue: requiresServiceVenue(category?.slug) ? data.serviceVenue : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['services', serviceId] });
      router.push('/dashboard/provider/services');
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setServerError(error.message);
      } else {
        setServerError('Xidmət yenilənərkən xəta baş verdi');
      }
    },
  });

  const onSubmit = (data: EditServiceFormValues) => {
    if (requiresServiceVenue(selectedCategory?.slug) && !data.serviceVenue) {
      setError('serviceVenue', { type: 'manual', message: 'Xidmət yerini seçin' });
      return;
    }
    clearErrors('serviceVenue');
    setServerError(null);
    updateMutation.mutate(data);
  };

  const categoryId = watch('categoryId');
  const title = watch('title');
  const price = watch('price');
  const priceUnit = watch('priceUnit');
  const selectedCategory = categories.find((cat) => cat.id === categoryId);
  const serviceTypes = selectedCategory
    ? getServiceTypesForCategory(selectedCategory.slug)
    : undefined;
  const serviceTypeOptions =
    serviceTypes && title && !serviceTypes.includes(title)
      ? [title, ...serviceTypes]
      : serviceTypes;
  const showServiceTypeField = !!categoryId;
  const showServiceVenueField = requiresServiceVenue(selectedCategory?.slug);
  const availablePriceUnits = getPriceUnitsForCategorySlug(selectedCategory?.slug);
  const prevCategoryIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!categoryId) {
      prevCategoryIdRef.current = null;
      return;
    }
    if (prevCategoryIdRef.current !== null && prevCategoryIdRef.current !== categoryId) {
      setValue('title', '', { shouldValidate: false, shouldDirty: true });
      setValue('serviceVenue', undefined, { shouldValidate: false, shouldDirty: true });
      if (priceUnit === PriceUnit.PER_SQM) {
        setValue('priceUnit', PriceUnit.FIXED, { shouldValidate: false, shouldDirty: true });
      }
    }
    prevCategoryIdRef.current = categoryId;
  }, [categoryId, setValue, priceUnit]);

  if (isLoading || categoriesLoading || !hydrated) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (categoriesError) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Kateqoriyalar yüklənmədi. Səhifəni yeniləyin.
        </CardContent>
      </Card>
    );
  }

  if (loadError || !service) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-muted-foreground">Xidmət tapılmadı və ya yüklənmədi.</p>
          <Link href="/dashboard/provider/services" className={buttonStyles('outline')}>
            <ArrowLeft className="h-4 w-4" />
            Xidmətlərə qayıt
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (service.providerId !== userId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-muted-foreground">Bu xidməti redaktə etmək icazəniz yoxdur.</p>
          <Link href="/dashboard/provider/services" className={buttonStyles('outline')}>
            <ArrowLeft className="h-4 w-4" />
            Xidmətlərə qayıt
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Xidməti düzəliş et</h1>
          <p className="mt-1 text-muted-foreground">
            «{service.title}» xidmətinin məlumatlarını yeniləyin.
          </p>
        </div>
        <Link href="/dashboard/provider/services" className={buttonStyles('outline', 'sm')}>
          <ArrowLeft className="h-4 w-4" />
          Geri
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Xidmət məlumatları</CardTitle>
          <CardDescription>
            Xidmət növü, təsvir, kateqoriya, qiymət və yer məlumatlarını dəyişdirin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            <div className="space-y-2">
              <Label htmlFor="categoryId">Kateqoriya</Label>
              <Select
                id="categoryId"
                error={!!errors.categoryId}
                disabled={isSubmitting}
                {...register('categoryId')}
              >
                <option value="">Kateqoriya seçin</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
              {errors.categoryId && (
                <p className="text-sm text-destructive">{errors.categoryId.message}</p>
              )}
            </div>

            {showServiceVenueField && (
              <div className="space-y-2">
                <Label>Xidmət yeri</Label>
                <ServiceVenueSelector
                  value={watch('serviceVenue')}
                  onChange={(venue) => {
                    setValue('serviceVenue', venue, { shouldValidate: true, shouldDirty: true });
                    clearErrors('serviceVenue');
                  }}
                  disabled={isSubmitting}
                  error={!!errors.serviceVenue}
                />
                {errors.serviceVenue && (
                  <p className="text-sm text-destructive">{errors.serviceVenue.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Gözəllik xidməti üçün xidmətin ünvanda və ya salonda göstərildiyini seçin.
                </p>
              </div>
            )}

            {showServiceTypeField && (
              <div className="space-y-2">
                <Label htmlFor="title">Xidmətin növü</Label>
                {serviceTypeOptions ? (
                  <Select
                    id="title"
                    error={!!errors.title}
                    disabled={isSubmitting}
                    {...register('title')}
                  >
                    <option value="">Xidmət növünü seçin</option>
                    {serviceTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    id="title"
                    placeholder="Məs: Ev təmiri xidməti"
                    error={!!errors.title}
                    disabled={isSubmitting}
                    {...register('title')}
                  />
                )}
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Təsvir</Label>
              <Textarea
                id="description"
                placeholder="Xidmətiniz haqqında ətraflı məlumat yazın..."
                className="min-h-[140px]"
                error={!!errors.description}
                disabled={isSubmitting}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Qiymət (AZN)</Label>
                <Input
                  id="price"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="50"
                  error={!!errors.price}
                  disabled={isSubmitting}
                  {...register('price', { valueAsNumber: true })}
                />
                {errors.price && (
                  <p className="text-sm text-destructive">{errors.price.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priceUnit">Qiymət növü</Label>
                <Select id="priceUnit" disabled={isSubmitting} {...register('priceUnit')}>
                  {availablePriceUnits.map((value) => (
                    <option key={value} value={value}>
                      {PRICE_UNIT_LABELS[value]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {price > 0 && (
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-sm text-muted-foreground">Göstəriləcək qiymət</p>
                <p className="mt-1 text-2xl font-bold text-brand-dark">
                  {formatPrice(price)}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    / {PRICE_UNIT_LABELS[priceUnit]}
                  </span>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="location">Ünvan (istəyə bağlı)</Label>
              <Input
                id="location"
                placeholder="Bakı, Nəsimi rayonu"
                disabled={isSubmitting}
                {...register('location')}
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:border-brand/40 hover:bg-brand/5">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border accent-brand"
                disabled={isSubmitting}
                {...register('isRemote')}
              />
              <div>
                <span className="text-sm font-medium">Uzaqdan xidmət (onlayn)</span>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Fiziki olaraq getmədən onlayn xidmət təklif edirsinizsə, bunu işarələyin.
                </p>
              </div>
            </label>

            {serverError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-border/50 pt-6 sm:flex-row sm:justify-end">
              <Link
                href="/dashboard/provider/services"
                className={buttonStyles('outline', 'md') + ' sm:min-w-[120px]'}
              >
                Ləğv et
              </Link>
              <Button type="submit" disabled={isSubmitting || !isDirty} className="sm:min-w-[160px]">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Yadda saxlanılır...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Yadda saxla
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
