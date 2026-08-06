'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@xidmetal/shared';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { getAdminAppUrl } from '@/lib/auth';

export function LoginForm() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [adminHint, setAdminHint] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    setAdminHint(null);

    try {
      const response = await api.auth.login(values);
      setAuth(response.user);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 403) {
          setAdminHint(getAdminAppUrl());
        }
        setServerError(error.message);
      } else {
        setServerError('Daxil olmaq mümkün olmadı. Yenidən cəhd edin.');
      }
    }
  };

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

      <div className="space-y-2">
        <Label htmlFor="password">Şifrə</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Şifrənizi daxil edin"
            error={!!errors.password}
            disabled={isSubmitting}
            className="pr-10"
            {...register('password')}
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
        {errors.password && (
          <p className="text-sm text-destructive" role="alert">
            {errors.password.message}
          </p>
        )}
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-brand-dark hover:underline sm:text-sm"
          >
            Şifrəni unutdum?
          </Link>
        </div>
      </div>

      {serverError && (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <p>{serverError}</p>
          {adminHint && (
            <a
              href={adminHint}
              className="mt-2 inline-block font-medium underline underline-offset-2"
            >
              Admin panelini aç
            </a>
          )}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Daxil olunur...
          </>
        ) : (
          'Daxil ol'
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Hesabınız yoxdur?{' '}
        <Link href="/register" className="font-medium text-brand-dark hover:underline">
          Qeydiyyatdan keçin
        </Link>
      </p>
    </form>
  );
}
