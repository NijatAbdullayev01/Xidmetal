'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, UserRole, type LoginInput } from '@xidmetal/shared';
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useAuthHydrated } from '@/hooks/use-auth-hydrated';
import { useEffect } from 'react';

export function AdminLoginPage() {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => (state.session && state.user ? 'session' : null));
  const setAuth = useAuthStore((state) => state.setAuth);
  const logout = useAuthStore((state) => state.logout);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && user && token && user.role === UserRole.ADMIN) {
      router.replace('/');
    }
  }, [hydrated, user, token, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      const response = await api.auth.login(values);
      setAuth(response.user);
      router.replace('/');
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 403) {
          // Audience rəddində API cookie silib; Zustand-ı da təmizlə
          logout();
        }
        setServerError(error.message);
      } else {
        setServerError('Daxil olmaq mümkün olmadı');
      }
    }
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle variant="switch" />
      </div>
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/20">
            <Shield className="h-6 w-6 text-brand-dark" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Admin paneli</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Yalnız administrator hesabı ilə daxil olun
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">E-poçt</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              error={!!errors.email}
              disabled={isSubmitting}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Şifrə</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                error={!!errors.password}
                disabled={isSubmitting}
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}

          <Button type="submit" className="w-full min-h-[44px]" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Yoxlanır…
              </>
            ) : (
              'Daxil ol'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
