'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

const reviewFormSchema = z
  .object({
    rating: z.number().int().min(1, 'Reytinq seçin').max(5),
    comment: z.string().max(2000, 'Şərh maksimum 2000 simvol ola bilər').optional(),
  })
  .superRefine((data, ctx) => {
    const trimmed = data.comment?.trim();
    if (trimmed && trimmed.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Şərh minimum 10 simvol olmalıdır',
        path: ['comment'],
      });
    }
  });

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

interface ReviewDialogProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  serviceTitle: string;
  token: string;
  onSuccess: () => void;
}

export function ReviewDialog({
  open,
  onClose,
  bookingId,
  serviceTitle,
  token,
  onSuccess,
}: ReviewDialogProps) {
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
  });

  const rating = watch('rating');

  useEffect(() => {
    if (!open) return;
    reset({ rating: 0, comment: '' });
    setHoveredRating(0);
    setSubmitError(null);
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: ReviewFormValues) => {
      const trimmed = values.comment?.trim();
      return api.createReview(token, {
        bookingId,
        rating: values.rating,
        ...(trimmed ? { comment: trimmed } : {}),
      });
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else {
        setSubmitError('Rəy göndərilərkən xəta baş verdi');
      }
    },
  });

  const onSubmit = (values: ReviewFormValues) => {
    setSubmitError(null);
    mutation.mutate(values);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="İşi təsdiqlə və rəy yaz"
      description={`${serviceTitle} xidməti üçün reytinq və rəy formu`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">İşi təsdiqlə və rəy yaz</h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">{serviceTitle}</p>
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
            <Label>Reytinq</Label>
            <div
              className="flex items-center gap-1"
              role="radiogroup"
              aria-label="Reytinq"
              onMouseLeave={() => setHoveredRating(0)}
            >
              {Array.from({ length: 5 }).map((_, index) => {
                const value = index + 1;
                const active = (hoveredRating || rating) >= value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    aria-label={`${value} ulduz`}
                    className="rounded-md p-1.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    onMouseEnter={() => setHoveredRating(value)}
                    onClick={() =>
                      setValue('rating', value, { shouldValidate: true, shouldDirty: true })
                    }
                  >
                    <Star
                      className={cn(
                        'h-7 w-7 sm:h-8 sm:w-8',
                        active ? 'fill-brand text-brand' : 'text-muted-foreground/30',
                      )}
                    />
                  </button>
                );
              })}
            </div>
            {errors.rating && (
              <p className="text-sm text-destructive" role="alert">
                {errors.rating.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-comment">Şərh (istəyə bağlı)</Label>
            <Textarea
              id="review-comment"
              rows={4}
              placeholder="Xidmət haqqında fikirlərinizi yazın..."
              disabled={mutation.isPending}
              {...register('comment')}
            />
            {errors.comment && (
              <p className="text-sm text-destructive" role="alert">
                {errors.comment.message}
              </p>
            )}
          </div>

          {submitError && (
            <div
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {submitError}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/60 px-5 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Ləğv et
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Təsdiqlə və göndər'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
