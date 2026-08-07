'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createReportSchema,
  reportReasonLabels,
  ReportReason,
  ReportTargetType,
  type CreateReportInput,
} from '@xidmetal/shared';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';

const TARGET_OPTIONS = [
  { value: ReportTargetType.BOOKING, label: 'Sifariş' },
  { value: ReportTargetType.SERVICE, label: 'Xidmət' },
  { value: ReportTargetType.USER, label: 'İstifadəçi' },
  { value: ReportTargetType.MESSAGE, label: 'Mesaj' },
  { value: ReportTargetType.OTHER, label: 'Digər' },
];

const REASON_OPTIONS = Object.values(ReportReason).map((value) => ({
  value,
  label: reportReasonLabels[value],
}));

interface ReportFormProps {
  defaultTargetType?: ReportTargetType;
  defaultTargetId?: string;
}

export function ReportForm({ defaultTargetType, defaultTargetId }: ReportFormProps) {
  const token = useAuthToken();
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateReportInput>({
    resolver: zodResolver(createReportSchema),
    defaultValues: {
      targetType: defaultTargetType ?? ReportTargetType.OTHER,
      targetId: defaultTargetId ?? '',
      reason: ReportReason.OTHER,
      description: '',
    },
  });

  const targetType = watch('targetType');
  const reason = watch('reason');
  const needsTargetId = targetType !== ReportTargetType.OTHER;

  const onSubmit = async (values: CreateReportInput) => {
    if (!token) {
      setServerError('Şikayət göndərmək üçün daxil olun');
      return;
    }

    setServerError(null);
    try {
      await api.reports.create(token, {
        targetType: values.targetType,
        targetId: values.targetId?.trim() || undefined,
        reason: values.reason,
        description: values.description.trim(),
      });
      setSubmitted(true);
      reset({
        targetType: ReportTargetType.OTHER,
        targetId: '',
        reason: ReportReason.OTHER,
        description: '',
      });
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : 'Şikayət göndərilmədi. Bir az sonra yenidən cəhd edin.',
      );
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/20">
          <CheckCircle2 className="h-7 w-7 text-brand-dark" aria-hidden />
        </div>
        <h2 className="mt-6 text-xl font-semibold">Şikayətiniz qəbul olundu</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Moderasiya komandamız araşdıracaq. Lazım gələrsə sizinlə əlaqə saxlayacağıq.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6 min-h-[44px]"
          onClick={() => setSubmitted(false)}
        >
          Yeni şikayət göndər
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
      noValidate
    >
      <h2 className="text-xl font-semibold">Şikayət formu</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Spam, təhqir, fırıldaq və ya digər pozuntuları bildirin. Yalan şikayət hesabı riskə ata
        bilər.
      </p>

      <div className="mt-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="report-target-type">Nə haqqında?</Label>
          <Select
            id="report-target-type"
            value={targetType}
            onChange={(next) =>
              setValue('targetType', next as ReportTargetType, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            options={TARGET_OPTIONS}
            placeholder="Hədəf seçin"
          />
          {errors.targetType && (
            <p className="text-sm text-destructive">{errors.targetType.message}</p>
          )}
        </div>

        {needsTargetId && (
          <div className="space-y-2">
            <Label htmlFor="report-target-id">Obyekt ID-si</Label>
            <Input
              id="report-target-id"
              placeholder="Sifariş, xidmət və ya istifadəçi UUID"
              {...register('targetId')}
            />
            {errors.targetId && (
              <p className="text-sm text-destructive">{errors.targetId.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              ID-ni sifariş/xidmət/mesaj səhifəsinin ünvanından və ya detallarından kopyalaya
              bilərsiniz.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="report-reason">Səbəb</Label>
          <Select
            id="report-reason"
            value={reason}
            onChange={(next) =>
              setValue('reason', next as ReportReason, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            options={REASON_OPTIONS}
            placeholder="Səbəb seçin"
          />
          {errors.reason && (
            <p className="text-sm text-destructive">{errors.reason.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="report-description">Təsvir</Label>
          <Textarea
            id="report-description"
            rows={5}
            placeholder="Nə baş verdi? Tarix, kontekst və sübutları qısa yazın..."
            {...register('description')}
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>

        {serverError && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {serverError}
          </p>
        )}

        <Button type="submit" className="min-h-[44px] w-full sm:w-auto" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Göndərilir…
            </>
          ) : (
            'Şikayəti göndər'
          )}
        </Button>
      </div>
    </form>
  );
}
