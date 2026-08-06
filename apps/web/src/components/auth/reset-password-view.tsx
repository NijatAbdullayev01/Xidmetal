'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordInput } from '@xidmetal/shared';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultEmail = searchParams.get('email') ?? '';
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: defaultEmail,
      code: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const onSubmit = async (values: ResetPasswordInput) => {
    setServerError(null);
    setSuccessMessage(null);

    try {
      const response = await api.auth.resetPassword({
        email: values.email,
        code: values.code,
        newPassword: values.newPassword,
      });
      setSuccessMessage(response.message);
      window.setTimeout(() => router.replace('/login'), 1500);
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
      } else {
        setServerError('Şifrə yenilənmədi. Yenidən cəhd edin.');
      }
    }
  };

  if (successMessage) {
    return (
      <div className="space-y-4 text-center" role="status">
        <p className="rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-sm">
          {successMessage}
        </p>
        <p className="text-sm text-muted-foreground">Daxil ol səhifəsinə yönləndirilirsiniz…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">E-poçt</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
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

      <div className="space-y-2">
        <Label htmlFor="code">Təsdiq kodu</Label>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          maxLength={6}
          error={!!errors.code}
          disabled={isSubmitting}
          {...register('code')}
        />
        {errors.code && (
          <p className="text-sm text-destructive" role="alert">
            {errors.code.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">Yeni şifrə</Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            error={!!errors.newPassword}
            disabled={isSubmitting}
            className="pr-10"
            {...register('newPassword')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.newPassword && (
          <p className="text-sm text-destructive" role="alert">
            {errors.newPassword.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmNewPassword">Şifrəni təkrarlayın</Label>
        <Input
          id="confirmNewPassword"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          error={!!errors.confirmNewPassword}
          disabled={isSubmitting}
          {...register('confirmNewPassword')}
        />
        {errors.confirmNewPassword && (
          <p className="text-sm text-destructive" role="alert">
            {errors.confirmNewPassword.message}
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
            Yenilənir...
          </>
        ) : (
          'Şifrəni yenilə'
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/forgot-password" className="font-medium text-brand-dark hover:underline">
          Kodu yenidən göndər
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordView() {
  return (
    <AuthPageShell
      title="Yeni şifrə"
      description="E-poçtunuza gələn kodu və yeni şifrəni daxil edin"
      maxWidth="md"
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthPageShell>
  );
}
