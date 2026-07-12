'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createServiceSchema, PRICE_UNIT_VALUES, PriceUnit, ServiceVenue, requiresServiceVenue, SERVICE_VENUE_LABELS } from '@xidmetal/shared';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  FileText,
  Loader2,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Stepper, type StepItem } from '@/components/ui/stepper';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { PRICE_UNIT_LABELS, getPriceUnitsForCategorySlug } from '@/lib/provider-labels';
import { formatPrice } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { getServiceTypesForCategory } from '@/lib/service-types';
import { ServiceVenueSelector } from '@/components/services/service-venue-selector';

const serviceFormSchema = createServiceSchema.extend({
  priceUnit: z.enum(PRICE_UNIT_VALUES),
  isRemote: z.boolean(),
  serviceVenue: z.nativeEnum(ServiceVenue).optional(),
  experience: z
    .number({ invalid_type_error: 'Təcrübə müddətini daxil edin' })
    .int('Təcrübə tam rəqəm olmalıdır')
    .min(1, 'Təcrübə minimum 1 il olmalıdır')
    .max(50, 'Təcrübə maksimum 50 il ola bilər'),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

const STEPS: StepItem[] = [
  {
    id: 1,
    title: 'Əsas məlumat',
    description: 'Kateqoriya, növ, təcrübə və təsvir',
    icon: FileText,
  },
  {
    id: 2,
    title: 'Qiymət',
    description: 'Qiymət və ödəniş növü',
    icon: Briefcase,
  },
  {
    id: 3,
    title: 'Yer',
    description: 'Xidmət ərazisi',
    icon: MapPin,
  },
  {
    id: 4,
    title: 'Yekun',
    description: 'Yoxlayın və təsdiq edin',
    icon: Sparkles,
  },
];

const STEP_FIELDS: Record<number, (keyof ServiceFormValues)[]> = {
  1: ['categoryId', 'title', 'experience', 'description'],
  2: ['price', 'priceUnit'],
  3: [],
};

export function NewServiceForm() {
  const router = useRouter();
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories(),
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      title: '',
      description: '',
      categoryId: '',
      price: 0,
      priceUnit: PriceUnit.FIXED,
      location: '',
      isRemote: false,
      serviceVenue: undefined,
      experience: undefined,
    },
  });

  const values = watch();

  const createMutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      if (!token) throw new ApiError('Autentifikasiya tələb olunur', 401);
      const category = categories.find((cat) => cat.id === data.categoryId);
      await api.users.updateProfile(token, { experience: data.experience });
      const service = await api.createService(token, {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        price: Number(data.price),
        priceUnit: data.priceUnit,
        location: data.location?.trim() || undefined,
        isRemote: data.isRemote,
        serviceVenue: requiresServiceVenue(category?.slug) ? data.serviceVenue : undefined,
      });
      return api.updateService(token, service.id, { status: 'ACTIVE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      router.push('/dashboard/provider/services');
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setServerError(error.message);
      } else {
        setServerError('Xidmət yaradılarkən xəta baş verdi');
      }
    },
  });

  const isSaving = createMutation.isPending;

  const onSubmit = (data: ServiceFormValues) => {
    if (!isConfirmed || isSaving) return;
    setServerError(null);
    createMutation.mutate(data);
  };

  const goNext = async () => {
    const fields = STEP_FIELDS[currentStep];
    if (fields && fields.length > 0) {
      const valid = await trigger(fields);
      if (!valid) return;
    }

    if (
      currentStep === 1 &&
      requiresServiceVenue(selectedCategory?.slug) &&
      !values.serviceVenue
    ) {
      setError('serviceVenue', { type: 'manual', message: 'Xidmət yerini seçin' });
      return;
    }
    clearErrors('serviceVenue');

    setCurrentStep((prev) => {
      const next = Math.min(prev + 1, STEPS.length);
      if (next === STEPS.length) setIsConfirmed(false);
      return next;
    });
  };

  const goBack = () => {
    if (currentStep === 1) {
      router.back();
      return;
    }
    setIsConfirmed(false);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const selectedCategory = categories.find((cat) => cat.id === values.categoryId);
  const showServiceVenueField = requiresServiceVenue(selectedCategory?.slug);
  const serviceTypes = selectedCategory
    ? getServiceTypesForCategory(selectedCategory.slug)
    : undefined;
  const showServiceTypeField = !!values.categoryId;
  const availablePriceUnits = getPriceUnitsForCategorySlug(selectedCategory?.slug);
  const currentStepMeta = STEPS[currentStep - 1];

  const prevCategoryIdRef = useRef<string | null>(null);
  useEffect(() => {
    const categoryId = selectedCategory?.id ?? null;
    if (!categoryId) {
      prevCategoryIdRef.current = null;
      return;
    }
    if (prevCategoryIdRef.current !== null && prevCategoryIdRef.current !== categoryId) {
      setValue('title', '', { shouldValidate: false });
      setValue('serviceVenue', undefined, { shouldValidate: false });
      if (values.priceUnit === PriceUnit.PER_SQM) {
        setValue('priceUnit', PriceUnit.FIXED, { shouldValidate: false });
      }
    }
    prevCategoryIdRef.current = categoryId;
  }, [selectedCategory?.id, setValue, values.priceUnit]);

  if (categoriesLoading) {
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

  return (
    <div className="w-full space-y-8">
      {/* Başlıq */}
      <div className="relative overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/15 via-card to-card p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand/20 blur-2xl"
        />
        <div className="relative">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Xidmət ver</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Addım-addım formu doldurun, son addımda məlumatları yoxlayın və xidmətinizi
            təsdiqləyərək dərc edin.
          </p>
        </div>
      </div>

      {/* Addım göstəricisi */}
      <Stepper steps={STEPS} currentStep={currentStep} />

      {/* Form kartı */}
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/50 bg-muted/30">
          <div className="flex items-start gap-4">
            {currentStepMeta && (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/20">
                <currentStepMeta.icon className="h-6 w-6 text-brand-dark" strokeWidth={1.75} />
              </div>
            )}
            <div>
              <CardTitle className="text-xl">
                {currentStepMeta?.title}
              </CardTitle>
              <CardDescription className="mt-1">
                {currentStepMeta?.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            {/* Addım 1: Əsas məlumat */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="categoryId">Kateqoriya</Label>
                  <Select
                    id="categoryId"
                    error={!!errors.categoryId}
                    disabled={isSaving}
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
                  <p className="text-xs text-muted-foreground">
                    Düzgün kateqoriya seçimi xidmətinizin axtarış nəticələrində daha yaxşı
                    görünməsinə kömək edir.
                  </p>
                </div>

                {showServiceVenueField && (
                  <div className="space-y-2">
                    <Label>Xidmət yeri</Label>
                    <ServiceVenueSelector
                      value={values.serviceVenue}
                      onChange={(venue) => {
                        setValue('serviceVenue', venue, { shouldValidate: true });
                        clearErrors('serviceVenue');
                      }}
                      disabled={isSaving}
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
                    {serviceTypes ? (
                      <Select
                        id="title"
                        error={!!errors.title}
                        disabled={isSaving}
                        {...register('title')}
                      >
                        <option value="">Xidmət növünü seçin</option>
                        {serviceTypes.map((type) => (
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
                        disabled={isSaving}
                        {...register('title')}
                      />
                    )}
                    {errors.title && (
                      <p className="text-sm text-destructive">{errors.title.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {serviceTypes
                        ? 'Təklif etdiyiniz xidmət növünü seçin.'
                        : 'Qısa və aydın xidmət növü müştərilərin diqqətini cəlb edir.'}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="experience">Təcrübə (il)</Label>
                  <Input
                    id="experience"
                    type="number"
                    min="1"
                    max="50"
                    step="1"
                    placeholder="5"
                    autoComplete="off"
                    error={!!errors.experience}
                    disabled={isSaving}
                    {...register('experience', { valueAsNumber: true })}
                  />
                  {errors.experience && (
                    <p className="text-sm text-destructive">{errors.experience.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Bu sahədə xidmət göstərdiyiniz sahədə neçə illik təcrübəniz olduğunu qeyd edin.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Təsvir</Label>
                  <Textarea
                    id="description"
                    placeholder="Xidmətiniz haqqında ətraflı məlumat yazın..."
                    className="min-h-[140px]"
                    error={!!errors.description}
                    disabled={isSaving}
                    {...register('description')}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">{errors.description.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Nə təklif etdiyinizi və üstünlüklərinizi qeyd edin.
                  </p>
                </div>
              </div>
            )}

            {/* Addım 2: Qiymət */}
            {currentStep === 2 && (
              <div className="space-y-5">
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
                      disabled={isSaving}
                      {...register('price', { valueAsNumber: true })}
                    />
                    {errors.price && (
                      <p className="text-sm text-destructive">{errors.price.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priceUnit">Qiymət növü</Label>
                    <Select
                      id="priceUnit"
                      disabled={isSaving}
                      {...register('priceUnit')}
                    >
                      {availablePriceUnits.map((value) => (
                        <option key={value} value={value}>
                          {PRICE_UNIT_LABELS[value]}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                {values.price > 0 && (
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">Göstəriləcək qiymət</p>
                    <p className="mt-1 text-2xl font-bold text-brand-dark">
                      {formatPrice(values.price)}
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        / {PRICE_UNIT_LABELS[values.priceUnit]}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Addım 3: Yer */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="location">Ünvan (istəyə bağlı)</Label>
                  <Input
                    id="location"
                    placeholder="Bakı, Nəsimi rayonu"
                    disabled={isSaving}
                    {...register('location')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Xidmət göstərdiyiniz ərazini qeyd edin.
                  </p>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:border-brand/40 hover:bg-brand/5">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-border accent-brand"
                    disabled={isSaving}
                    {...register('isRemote')}
                  />
                  <div>
                    <span className="text-sm font-medium">Uzaqdan xidmət (onlayn)</span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Fiziki olaraq getmədən onlayn xidmət təklif edirsinizsə, bunu işarələyin.
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Addım 4: Yekun */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div className="rounded-xl border border-brand/20 bg-gradient-to-br from-brand/10 to-transparent p-5">
                  <div className="flex items-center gap-2 text-brand-dark">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="font-semibold">Son yoxlama</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Aşağıdakı məlumatları diqqətlə yoxlayın. Dərc etmək üçün məlumatların
                    düzgünlüyünü təsdiq etməlisiniz.
                  </p>
                </div>

                <dl className="divide-y divide-border rounded-xl border border-border">
                  <div className="grid gap-1 p-4 sm:grid-cols-3">
                    <dt className="text-sm font-medium text-muted-foreground">Xidmətin növü</dt>
                    <dd className="text-sm font-medium sm:col-span-2">{values.title}</dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-3">
                    <dt className="text-sm font-medium text-muted-foreground">Təcrübə</dt>
                    <dd className="text-sm font-medium sm:col-span-2">
                      {values.experience ? `${values.experience} il` : '—'}
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-3">
                    <dt className="text-sm font-medium text-muted-foreground">Təsvir</dt>
                    <dd className="text-sm sm:col-span-2 line-clamp-3">{values.description}</dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-3">
                    <dt className="text-sm font-medium text-muted-foreground">Kateqoriya</dt>
                    <dd className="text-sm font-medium sm:col-span-2">
                      {selectedCategory?.name ?? '—'}
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-3">
                    <dt className="text-sm font-medium text-muted-foreground">Qiymət</dt>
                    <dd className="text-sm font-medium text-brand-dark sm:col-span-2">
                      {values.price > 0
                        ? `${formatPrice(values.price)} / ${PRICE_UNIT_LABELS[values.priceUnit]}`
                        : '—'}
                    </dd>
                  </div>
                  <div className="grid gap-1 p-4 sm:grid-cols-3">
                    <dt className="text-sm font-medium text-muted-foreground">Yer</dt>
                    <dd className="text-sm sm:col-span-2">
                      {[
                        values.serviceVenue
                          ? SERVICE_VENUE_LABELS[values.serviceVenue]
                          : null,
                        values.isRemote && values.location
                          ? `${values.location} (uzaqdan da mümkündür)`
                          : values.isRemote
                            ? 'Uzaqdan (onlayn)'
                            : values.location || null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Göstərilməyib'}
                    </dd>
                  </div>
                </dl>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:border-brand/40 hover:bg-brand/5 has-[:checked]:border-brand/50 has-[:checked]:bg-brand/5">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-brand"
                    checked={isConfirmed}
                    disabled={isSaving}
                    onChange={(event) => setIsConfirmed(event.target.checked)}
                  />
                  <div>
                    <span className="text-sm font-medium">
                      Məlumatların düzgünlüyünü təsdiq edirəm
                    </span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Xidmətinizi yalnız siz təsdiqlədikdən sonra müştərilərə görünən olacaq.
                    </p>
                  </div>
                </label>

                {serverError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {serverError}
                  </div>
                )}
              </div>
            )}

            {/* Naviqasiya düymələri */}
            <div className="flex flex-col-reverse gap-3 border-t border-border/50 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={goBack}
                className="sm:min-w-[120px]"
              >
                <ArrowLeft className="h-4 w-4" />
                {currentStep === 1 ? 'Ləğv et' : 'Geri'}
              </Button>

              {currentStep < STEPS.length ? (
                <Button type="button" onClick={goNext} className="sm:min-w-[140px]">
                  Növbəti
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSaving || !isConfirmed}
                  className="sm:min-w-[160px]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Dərc edilir...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Təsdiq et və dərc et
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
