'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  confirmEmailVerificationSchema,
  type ConfirmEmailVerificationInput,
} from '@xidmetal/shared';
import { Loader2 } from 'lucide-react';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import {
  TurnstileWidget,
  isTurnstileConfigured,
} from '@/components/auth/turnstile-widget';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import { getPostAuthRedirectPath, takeDevEmailCode } from '@/lib/auth';
import { useAuthStore } from '@/store/auth.store';
import { useAuthHydrated } from '@/hooks/use-auth-hydrated';

function formatDevCodeMessage(message: string, previewCode?: string): string {
  return previewCode ? `${message} (DEV kod: ${previewCode})` : message;
}

export function VerifyEmailView() {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [serverError, setServerError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const autoRequestedRef = useRef(false);

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmEmailVerificationInput>({
    resolver: zodResolver(confirmEmailVerificationSchema),
    defaultValues: {
      email: '',
      code: '',
    },
  });

  useEffect(() => {
    if (user?.email) {
      setValue('email', user.email);
    }
  }, [user?.email, setValue]);

  useEffect(() => {
    if (!hydrated) return;

    const stashed = takeDevEmailCode();
    if (stashed) {
      setDevCode(stashed);
      setValue('code', stashed);
      return;
    }

    // Login sonrası / stashed yoxdursa — test rejimində kodu avtomatik yenilə
    if (
      autoRequestedRef.current ||
      !user?.email ||
      user.isVerified ||
      isTurnstileConfigured()
    ) {
      return;
    }

    autoRequestedRef.current = true;
    void (async () => {
      try {
        const response = await api.auth.requestEmailVerification({
          email: user.email,
        });
        setInfoMessage(formatDevCodeMessage(response.message, response.previewCode));
        if (response.previewCode) {
          setDevCode(response.previewCode);
          setValue('code', response.previewCode);
        }
      } catch {
        // İstifadəçi «Kodu yenidən göndər» ilə davam edə bilər
      }
    })();
  }, [hydrated, user?.email, user?.isVerified, setValue]);

  const applyPreviewCode = (previewCode: string | undefined, message: string) => {
    setInfoMessage(formatDevCodeMessage(message, previewCode));
    if (previewCode) {
      setDevCode(previewCode);
      setValue('code', previewCode);
    }
  };

  const goToDashboard = () => {
    if (user) {
      router.replace(getPostAuthRedirectPath(user.role));
    } else {
      router.replace('/login');
    }
  };

  const onSubmit = async (values: ConfirmEmailVerificationInput) => {
    setServerError(null);
    setInfoMessage(null);

    try {
      const response = await api.auth.confirmEmailVerification(values);
      if (user) {
        setAuth(response.user);
      } else {
        updateUser(response.user);
      }
      setDevCode(null);
      setInfoMessage(response.message);
      window.setTimeout(goToDashboard, 1200);
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
      } else {
        setServerError('Təsdiq alınmadı. Yenidən cəhd edin.');
      }
    }
  };

  const onResend = async () => {
    const email = getValues('email') || user?.email;
    if (!email) return;

    if (isTurnstileConfigured() && !captchaToken) {
      setServerError('Zəhmət olmasa captcha-nı tamamlayın');
      return;
    }

    setIsResending(true);
    setServerError(null);
    setInfoMessage(null);

    try {
      const response = await api.auth.requestEmailVerification({
        email,
        captchaToken: captchaToken ?? undefined,
      });
      applyPreviewCode(response.previewCode, response.message);
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
      } else {
        setServerError('Kod göndərilmədi. Yenidən cəhd edin.');
      }
    } finally {
      setIsResending(false);
    }
  };

  if (!hydrated) {
    return (
      <AuthPageShell title="E-poçt təsdiqi" description="Hesabınızı təsdiqləyin" maxWidth="md">
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      </AuthPageShell>
    );
  }

  if (user?.isVerified) {
    return (
      <AuthPageShell
        title="E-poçt təsdiqlənib"
        description="Hesabınız artıq təsdiqlənib"
        maxWidth="md"
      >
        <Button size="lg" className="w-full" onClick={goToDashboard}>
          Hesaba keç
        </Button>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="E-poçt təsdiqi"
      description="Hesaba daxil olmaq üçün e-poçtunuza göndərilən 8 rəqəmli kodu daxil edin"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {devCode && (
          <div
            className="rounded-lg border border-brand/40 bg-brand/15 px-4 py-3 text-sm"
            role="status"
          >
            <p className="font-medium text-foreground">Test rejimi</p>
            <p className="mt-1 text-muted-foreground">
              Təsdiq kodu:{' '}
              <span className="font-mono text-base font-semibold tracking-widest text-foreground">
                {devCode}
              </span>
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">E-poçt</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            error={!!errors.email}
            disabled={isSubmitting || !!user?.email}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-destructive" role="alert">
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
            placeholder="12345678"
            maxLength={8}
            error={!!errors.code}
            disabled={isSubmitting}
            {...register('code')}
          />
          {errors.code && (
            <p className="text-xs text-destructive" role="alert">
              {errors.code.message}
            </p>
          )}
        </div>

        {infoMessage && (
          <div
            className="rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-sm"
            role="status"
          >
            {infoMessage}
          </div>
        )}

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
              Təsdiqlənir...
            </>
          ) : (
            'Təsdiqlə'
          )}
        </Button>

        <TurnstileWidget onToken={setCaptchaToken} />

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={isResending}
          onClick={() => void onResend()}
        >
          {isResending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Göndərilir...
            </>
          ) : (
            'Kodu yenidən göndər'
          )}
        </Button>

        {!user && (
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-brand-dark hover:underline">
              Daxil ol
            </Link>
          </p>
        )}
      </form>
    </AuthPageShell>
  );
}
