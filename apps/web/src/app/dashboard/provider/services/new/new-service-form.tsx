'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createServiceSchema } from '@xidmetal/shared';
import type { CategorySummary } from '@xidmetal/shared';
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
  Tag,
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
import { PRICE_UNIT_LABELS } from '@/lib/provider-labels';
import { formatPrice } from '@/lib/utils';
import { useState } from 'react';

const serviceFormSchema = createServiceSchema.extend({
  priceUnit: z.enum(['FIXED', 'HOURLY', 'DAILY']),
  isRemote: z.boolean(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

const STEPS: StepItem[] = [
  {
    id: 1,
    title: 'Əsas məlumat',
    description: 'Xidmətinizin adı və təsviri',
    icon: FileText,
  },
  {
    id: 2,
    title: 'Kateqoriya',
    description: 'Uyğun kateqoriya seçin',
    icon: Tag,
  },
  {
    id: 3,
    title: 'Qiymət',
    description: 'Qiymət və ödəniş növü',
    icon: Briefcase,
  },
  {
    id: 4,
    title: 'Yer',
    description: 'Xidmət ərazisi',
    icon: MapPin,
  },
  {
    id: 5,
    title: 'Yekun',
    description: 'Yoxlayın və dərc edin',
    icon: Sparkles,
  },
];

const STEP_FIELDS: Record<number, (keyof ServiceFormValues)[]> = {
  1: ['title', 'description'],
  2: ['categoryId'],
  3: ['price', 'priceUnit'],
  4: [],
};

interface NewServiceFormProps {
  categories: CategorySummary[];
}

export function NewServiceForm({ categories }: NewServiceFormProps) {
  const router = useRouter();
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      title: '',
      description: '',
      categoryId: '',
      price: 0,
      priceUnit: 'FIXED',
      location: '',
      isRemote: false,
    },
  });

  const values = watch();

  const createMutation = useMutation({
    mutationFn: (data: ServiceFormValues) => api.createService(token, data),
    onSuccess: async (service) => {
      await api.updateService(token, service.id, { status: 'ACTIVE' });
      queryClient.invalidateQueries({ queryKey: ['services', 'mine'] });
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

  const onSubmit = (data: ServiceFormValues) => {
    setServerError(null);
    createMutation.mutate({
      ...data,
      price: Number(data.price),
      location: data.location?.trim() || undefined,
    });
  };

  const goNext = async () => {
    const fields = STEP_FIELDS[currentStep];
    if (fields && fields.length > 0) {
      const valid = await trigger(fields);
      if (!valid) return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const goBack = () => {
    if (currentStep === 1) {
      router.back();
      return;
    }
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const selectedCategory = categories.find((cat) => cat.id === values.categoryId);
  const currentStepMeta = STEPS[currentStep - 1];

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
            Addım-addım formu doldurun və xidmətinizi müştərilərə təqdim edin. Yaradıldıqdan
            sonra avtomatik aktiv olacaq.
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
                  <Label htmlFor="title">Başlıq</Label>
                  <Input
                    id="title"
                    placeholder="Məs: Ev təmiri xidməti"
                    error={!!errors.title}
                    disabled={isSubmitting}
                    {...register('title')}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Qısa və aydın başlıq müştərilərin diqqətini cəlb edir.
                  </p>
                </div>

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
                  <p className="text-xs text-muted-foreground">
                    Nə təklif etdiyinizi, təcrübənizi və üstünlüklərinizi qeyd edin.
                  </p>
                </div>
              </div>
            )}

            {/* Addım 2: Kateqoriya */}
            {currentStep === 2 && (
              <div className="space-y-5">
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

                <div className="rounded-xl border border-dashed border-brand/30 bg-brand/5 p-4">
                  <p className="text-sm font-medium text-brand-foreground">Məsləhət</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Düzgün kateqoriya seçimi xidmətinizin axtarış nəticələrində daha yaxşı
                    görünməsinə kömək edir.
                  </p>
                </div>
              </div>
            )}

            {/* Addım 3: Qiymət */}
            {currentStep === 3 && (
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
                      disabled={isSubmitting}
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
                      disabled={isSubmitting}
                      {...register('priceUnit')}
                    >
                      {Object.entries(PRICE_UNIT_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
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

            {/* Addım 4: Yer */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="location">Ünvan (istəyə bağlı)</Label>
                  <Input
                    id="location"
                    placeholder="Bakı, Nəsimi rayonu"
                    disabled={isSubmitting}
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
              </div>
            )}

            {/* Addım 5: Yekun */}
            {currentStep === 5 && (
              <div className="space-y-5">
                <div className="rounded-xl border border-brand/20 bg-gradient-to-br from-brand/10 to-transparent p-5">
                  <div className="flex items-center gap-2 text-brand-dark">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="font-semibold">Xidmətiniz hazırdır!</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Aşağıdakı məlumatları yoxlayın. Hər şey düzgündürsə, xidməti yaradın.
                  </p>
                </div>

                <dl className="divide-y divide-border rounded-xl border border-border">
                  <div className="grid gap-1 p-4 sm:grid-cols-3">
                    <dt className="text-sm font-medium text-muted-foreground">Başlıq</dt>
                    <dd className="text-sm font-medium sm:col-span-2">{values.title}</dd>
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
                      {values.isRemote && values.location
                        ? `${values.location} (uzaqdan da mümkündür)`
                        : values.isRemote
                          ? 'Uzaqdan (onlayn)'
                          : values.location || 'Göstərilməyib'}
                    </dd>
                  </div>
                </dl>

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
                disabled={isSubmitting}
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
                <Button type="submit" disabled={isSubmitting} className="sm:min-w-[160px]">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Yaradılır...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Xidməti yarat
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
