'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@xidmetal/shared';
import { Loader2 } from 'lucide-react';
import { Button, buttonStyles } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordInput) => {
    setServerError(null);
    setSuccessMessage(null);

    try {
      const response = await api.auth.forgotPassword(values);
      setSuccessMessage(
        response.previewCode
          ? `${response.message} (DEV kod: ${response.previewCode})`
          : response.message,
      );
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
      } else {
        setServerError('Sorğu göndərilmədi. Yenidən cəhd edin.');
      }
    }
  };

  if (successMessage) {
    const email = encodeURIComponent(getValues('email'));
    return (
      <div className="space-y-6">
        <div
          className="rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          {successMessage}
        </div>
        <Link href={`/reset-password?email=${email}`} className={cn(buttonStyles('default', 'lg'), 'w-full')}>
          Kodu daxil et
        </Link>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-brand-dark hover:underline">
            Daxil ol səhifəsinə qayıt
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">E-poçt</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="ad@example.com"
          error={!!errors.email}
          disabled={isSubmitting}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-destructive" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      {serverError && (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {serverError}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Göndərilir...
          </>
        ) : (
          'Kod göndər'
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-brand-dark hover:underline">
          Daxil ol səhifəsinə qayıt
        </Link>
      </p>
    </form>
  );
}
