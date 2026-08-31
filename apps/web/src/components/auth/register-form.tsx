'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ProviderAccountType, UserRole, type RegisterInput } from '@xidmetal/shared';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { ProviderAccountTypeSelector } from '@/components/auth/provider-account-type-selector';
import { RoleSelector } from '@/components/auth/role-selector';
import { registerFormSchema, type RegisterFormValues, type PublicUserRole } from '@/components/auth/register-schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AZ_PHONE_PREFIX, azPhoneLocalPart, toAzPhoneValue } from '@/lib/phone';
import { api, ApiError } from '@/lib/api';
import { stashDevEmailCode } from '@/lib/auth';
import { useAuthStore } from '@/store/auth.store';
import {
  TurnstileWidget,
  isTurnstileConfigured,
} from '@/components/auth/turnstile-widget';

interface RegisterFormProps {
  defaultRole?: PublicUserRole;
}

export function RegisterForm({ defaultRole = UserRole.CUSTOMER }: RegisterFormProps) {
  const setAuth = useAuthStore((state) => state.setAuth);
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      role: defaultRole,
      providerAccountType:
        defaultRole === UserRole.PROVIDER ? ProviderAccountType.INDIVIDUAL : undefined,
      firstName: '',
      lastName: '',
      companyName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const selectedRole = watch('role');
  const selectedAccountType = watch('providerAccountType');
  const isProvider = selectedRole === UserRole.PROVIDER;
  const isCompany = isProvider && selectedAccountType === ProviderAccountType.COMPANY;

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);

    if (isTurnstileConfigured() && !captchaToken) {
      setServerError('Təhlükəsizlik yoxlamasını tamamlayın');
      return;
    }

    try {
      const { confirmPassword, phone, companyName, providerAccountType, firstName, lastName, ...rest } =
        values;
      void confirmPassword;
      const isCompanyAccount =
        rest.role === UserRole.PROVIDER &&
        (providerAccountType ?? ProviderAccountType.INDIVIDUAL) === ProviderAccountType.COMPANY;
      const payload: RegisterInput = {
        ...rest,
        phone: phone.trim(),
        captchaToken: captchaToken ?? undefined,
        ...(isCompanyAccount
          ? {}
          : { firstName: firstName?.trim(), lastName: lastName?.trim() }),
      };
      if (rest.role === UserRole.PROVIDER) {
        payload.providerAccountType = providerAccountType ?? ProviderAccountType.INDIVIDUAL;
        if (payload.providerAccountType === ProviderAccountType.COMPANY) {
          payload.companyName = companyName?.trim() || undefined;
        }
      }
      const response = await api.auth.register(payload);

      stashDevEmailCode(response.previewCode);
      setAuth(response.user);
      queryClient.setQueryData(['users', 'me'], response.user);
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
      } else {
        setServerError('Qeydiyyat zamanı xəta baş verdi. Yenidən cəhd edin.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5 sm:space-y-3" noValidate>
      <div className="space-y-2.5 sm:space-y-3">
        <Label>Hesab növü</Label>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <RoleSelector
              value={field.value}
              onChange={(role) => {
                field.onChange(role);
                if (role === UserRole.PROVIDER) {
                  setValue(
                    'providerAccountType',
                    selectedAccountType ?? ProviderAccountType.INDIVIDUAL,
                  );
                } else {
                  setValue('providerAccountType', undefined);
                  setValue('companyName', '');
                }
              }}
              disabled={isSubmitting}
            />
          )}
        />
        {errors.role && (
          <p className="text-sm text-destructive" role="alert">
            {errors.role.message}
          </p>
        )}
      </div>

      {isProvider && (
        <div className="space-y-2.5 sm:space-y-3">
          <Label>Qeydiyyat növü</Label>
          <Controller
            name="providerAccountType"
            control={control}
            render={({ field }) => (
              <ProviderAccountTypeSelector
                value={field.value ?? ProviderAccountType.INDIVIDUAL}
                onChange={(next) => {
                  field.onChange(next);
                  if (next === ProviderAccountType.COMPANY) {
                    setValue('firstName', '');
                    setValue('lastName', '');
                  } else {
                    setValue('companyName', '');
                  }
                }}
                disabled={isSubmitting}
              />
            )}
          />
          {errors.providerAccountType && (
            <p className="text-sm text-destructive" role="alert">
              {errors.providerAccountType.message}
            </p>
          )}
        </div>
      )}

      {isCompany && (
        <div className="space-y-2">
          <Label htmlFor="companyName">Şirkətin adı</Label>
          <Input
            id="companyName"
            autoComplete="organization"
            placeholder="məs. Xidmətal MMC"
            error={!!errors.companyName}
            disabled={isSubmitting}
            {...register('companyName')}
          />
          {errors.companyName ? (
            <p className="text-sm text-destructive" role="alert">
              {errors.companyName.message}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Xidmətlərdə bu ad görünəcək.</p>
          )}
        </div>
      )}

      {!isCompany && (
        <div className="grid grid-cols-2 gap-3 min-w-0 sm:gap-4">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="firstName">Ad</Label>
            <Input
              id="firstName"
              autoComplete="given-name"
              placeholder="Əli"
              error={!!errors.firstName}
              disabled={isSubmitting}
              {...register('firstName')}
            />
            {errors.firstName && (
              <p className="text-sm text-destructive" role="alert">
                {errors.firstName.message}
              </p>
            )}
          </div>

          <div className="min-w-0 space-y-2">
            <Label htmlFor="lastName">Soyad</Label>
            <Input
              id="lastName"
              autoComplete="family-name"
              placeholder="Məmmədov"
              error={!!errors.lastName}
              disabled={isSubmitting}
              {...register('lastName')}
            />
            {errors.lastName && (
              <p className="text-sm text-destructive" role="alert">
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 min-w-0 sm:gap-4">
        <div className="min-w-0 space-y-2">
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

        <div className="min-w-0 space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <div
                className={cn(
                  'flex h-10 w-full overflow-hidden rounded-lg border bg-background transition-colors',
                  'focus-within:border-brand focus-within:ring-2 focus-within:ring-inset focus-within:ring-brand/40',
                  errors.phone ? 'border-destructive' : 'border-border',
                  isSubmitting && 'cursor-not-allowed opacity-50',
                )}
              >
                <span
                  className="flex shrink-0 items-center border-r border-border bg-muted/40 px-2.5 text-sm text-muted-foreground select-none sm:px-3"
                  aria-hidden
                >
                  {AZ_PHONE_PREFIX}
                </span>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="numeric"
                  placeholder="501234567"
                  disabled={isSubmitting}
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={azPhoneLocalPart(field.value)}
                  onChange={(event) => {
                    field.onChange(toAzPhoneValue(event.target.value));
                  }}
                  className={cn(
                    'min-w-0 flex-1 bg-transparent px-2.5 py-2 text-sm outline-none sm:px-3',
                    'placeholder:text-muted-foreground',
                    'disabled:cursor-not-allowed',
                  )}
                  aria-invalid={!!errors.phone}
                />
              </div>
            )}
          />
          {errors.phone && (
            <p className="text-sm text-destructive" role="alert">
              {errors.phone.message}
            </p>
          )}
          {!errors.phone && (
            <p className="text-xs text-muted-foreground">
              Sifariş və dəstək üçün sizinlə əlaqə saxlamaq üçündür.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 min-w-0 sm:gap-4">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="password">Şifrə</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Minimum 8 simvol"
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
          {errors.password ? (
            <p className="text-sm text-destructive" role="alert">
              {errors.password.message}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Ən azı 8 simvol, bir böyük hərf və bir rəqəm olmalıdır.
            </p>
          )}
        </div>

        <div className="min-w-0 space-y-2">
          <Label htmlFor="confirmPassword">Şifrəni təkrarla</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Şifrəni təkrar daxil edin"
              error={!!errors.confirmPassword}
              disabled={isSubmitting}
              className="pr-10"
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showConfirmPassword ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-destructive" role="alert">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
      </div>

      {serverError && (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {serverError}
        </div>
      )}

      <TurnstileWidget onToken={setCaptchaToken} />

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Qeydiyyat edilir...
          </>
        ) : (
          'Qeydiyyatdan keç'
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Artıq hesabınız var?{' '}
        <Link href="/login" className="font-medium text-brand-dark hover:underline">
          Daxil olun
        </Link>
      </p>
    </form>
  );
}
