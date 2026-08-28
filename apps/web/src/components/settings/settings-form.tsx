'use client';

import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  updateProfileSchema,
  changePasswordSchema,
  requestEmailChangeSchema,
  confirmEmailChangeSchema,
  requestPhoneChangeSchema,
  confirmPhoneChangeSchema,
  deleteAccountSchema,
  type UpdateProfileInput,
  type ChangePasswordInput,
  type RequestEmailChangeInput,
  type ConfirmEmailChangeInput,
  type RequestPhoneChangeInput,
  type ConfirmPhoneChangeInput,
  type DeleteAccountInput,
  toDisplayMediaUrl,
} from '@xidmetal/shared';
import {
  Camera,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  User,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError, uploadImage } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useAuthHydrated } from '@/hooks/use-auth-hydrated';
import { useAuthStore } from '@/store/auth.store';
import { AZ_PHONE_PREFIX, azPhoneLocalPart, toAzPhoneValue } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { useLogout } from '@/hooks/use-logout';
import { useRouter } from 'next/navigation';

const MAX_AVATAR_SIZE_BYTES = 1 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

type ProfileFormValues = UpdateProfileInput;
type PasswordFormValues = ChangePasswordInput;

function UserAvatarPreview({
  avatarUrl,
  firstName,
  lastName,
  className,
}: {
  avatarUrl?: string;
  firstName?: string;
  lastName?: string;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={toDisplayMediaUrl(avatarUrl)}
        alt="Profil şəkli"
        className={cn('h-full w-full rounded-full object-cover', className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-brand/20 text-lg font-semibold text-brand-foreground',
        className,
      )}
    >
      {firstName?.[0]}
      {lastName?.[0]}
    </div>
  );
}

export function SettingsForm() {
  const hydrated = useAuthHydrated();
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const logout = useLogout();
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileServerError, setProfileServerError] = useState<string | null>(null);
  const [passwordServerError, setPasswordServerError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailChangeStep, setEmailChangeStep] = useState<'idle' | 'editing' | 'verify'>('idle');
  const [emailChangeSuccess, setEmailChangeSuccess] = useState<string | null>(null);
  const [emailChangeServerError, setEmailChangeServerError] = useState<string | null>(null);
  const [phoneChangeStep, setPhoneChangeStep] = useState<'idle' | 'editing' | 'verify'>('idle');
  const [phoneChangeSuccess, setPhoneChangeSuccess] = useState<string | null>(null);
  const [phoneChangeServerError, setPhoneChangeServerError] = useState<string | null>(null);

  const dismissTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const timeouts = dismissTimeouts.current;
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);
  const autoDismiss = (setter: (value: null) => void, delay: number) => {
    dismissTimeouts.current.push(setTimeout(() => setter(null), delay));
  };

  const { data: profile, isLoading, isError, error, isPlaceholderData } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => api.users.me(token!),
    enabled: !!token,
    // Qeydiyyat cavabındakı məlumatlar dərhal görünsün
    placeholderData: () => authUser ?? undefined,
  });

  const source = profile ?? authUser ?? undefined;

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: authUser?.firstName ?? '',
      lastName: authUser?.lastName ?? '',
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const deleteAccountForm = useForm<DeleteAccountInput>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: {
      password: '',
      confirmText: '',
    },
  });
  const [deleteServerError, setDeleteServerError] = useState<string | null>(null);
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  const emailRequestForm = useForm<RequestEmailChangeInput>({
    resolver: zodResolver(requestEmailChangeSchema),
    defaultValues: { newEmail: '' },
  });

  const emailConfirmForm = useForm<ConfirmEmailChangeInput>({
    resolver: zodResolver(confirmEmailChangeSchema),
    defaultValues: { newEmail: '', code: '' },
  });

  const phoneRequestForm = useForm<RequestPhoneChangeInput>({
    resolver: zodResolver(requestPhoneChangeSchema),
    defaultValues: { newPhone: '' },
  });

  const phoneConfirmForm = useForm<ConfirmPhoneChangeInput>({
    resolver: zodResolver(confirmPhoneChangeSchema),
    defaultValues: { newPhone: '', code: '' },
  });

  useEffect(() => {
    if (!source) return;

    profileForm.reset({
      firstName: source.firstName,
      lastName: source.lastName,
    });
    setAvatarPreview(source.avatarUrl);
    setAvatarRemoved(false);
    setAvatarError(null);
  }, [source, profileForm]);

  useEffect(() => {
    if (!profile || isPlaceholderData) return;
    updateUser(profile);
  }, [profile, isPlaceholderData, updateUser]);

  const profileMutation = useMutation({
    mutationFn: (data: ProfileFormValues) => {
      const payload: ProfileFormValues = {
        firstName: data.firstName,
        lastName: data.lastName,
      };

      if (avatarRemoved) {
        payload.avatarUrl = '';
      } else if (avatarPreview && avatarPreview !== source?.avatarUrl) {
        payload.avatarUrl = avatarPreview;
      }

      return api.users.updateProfile(token!, payload);
    },
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      queryClient.setQueryData(['users', 'me'], updatedUser);
      setAvatarPreview(updatedUser.avatarUrl);
      setAvatarRemoved(false);
      setProfileSuccess('Profil məlumatları yeniləndi');
      setProfileServerError(null);
      autoDismiss(setProfileSuccess, 4000);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setProfileServerError(error.message);
      } else {
        setProfileServerError('Profil yenilənərkən xəta baş verdi');
      }
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordFormValues) =>
      api.users.changePassword(token!, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmNewPassword: data.confirmNewPassword,
      }),
    onSuccess: () => {
      passwordForm.reset();
      logout();
      router.replace('/login');
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPasswordServerError(error.message);
      } else {
        setPasswordServerError('Şifrə dəyişdirilərkən xəta baş verdi');
      }
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (data: DeleteAccountInput) => api.users.deleteAccount(token!, data),
    onSuccess: () => {
      logout();
      router.replace('/');
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setDeleteServerError(error.message);
      } else {
        setDeleteServerError('Hesab silinərkən xəta baş verdi');
      }
    },
  });

  const requestEmailChangeMutation = useMutation({
    mutationFn: (data: RequestEmailChangeInput) =>
      api.users.requestEmailChange(token!, data),
    onSuccess: (_, variables) => {
      emailConfirmForm.setValue('newEmail', variables.newEmail);
      emailConfirmForm.setValue('code', '');
      setEmailChangeStep('verify');
      setEmailChangeServerError(null);
      setEmailChangeSuccess('Təsdiq kodu yeni e-poçt ünvanına göndərildi');
      autoDismiss(setEmailChangeSuccess, 5000);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setEmailChangeServerError(error.message);
      } else {
        setEmailChangeServerError('Kod göndərilərkən xəta baş verdi');
      }
    },
  });

  const confirmEmailChangeMutation = useMutation({
    mutationFn: (data: ConfirmEmailChangeInput) =>
      api.users.confirmEmailChange(token!, data),
    onSuccess: () => {
      emailRequestForm.reset();
      emailConfirmForm.reset();
      setEmailChangeStep('idle');
      logout();
      router.replace('/login');
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setEmailChangeServerError(error.message);
      } else {
        setEmailChangeServerError('E-poçt dəyişdirilərkən xəta baş verdi');
      }
    },
  });

  const requestPhoneChangeMutation = useMutation({
    mutationFn: (data: RequestPhoneChangeInput) =>
      api.users.requestPhoneChange(token!, data),
    onSuccess: (_, variables) => {
      phoneConfirmForm.setValue('newPhone', variables.newPhone);
      phoneConfirmForm.setValue('code', '');
      setPhoneChangeStep('verify');
      setPhoneChangeServerError(null);
      setPhoneChangeSuccess('Təsdiq kodu cari e-poçt ünvanınıza göndərildi');
      autoDismiss(setPhoneChangeSuccess, 5000);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPhoneChangeServerError(error.message);
      } else {
        setPhoneChangeServerError('Kod göndərilərkən xəta baş verdi');
      }
    },
  });

  const confirmPhoneChangeMutation = useMutation({
    mutationFn: (data: ConfirmPhoneChangeInput) =>
      api.users.confirmPhoneChange(token!, data),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      queryClient.setQueryData(['users', 'me'], updatedUser);
      phoneRequestForm.reset();
      phoneConfirmForm.reset();
      setPhoneChangeStep('idle');
      setPhoneChangeSuccess('Telefon nömrəsi yeniləndi');
      setPhoneChangeServerError(null);
      autoDismiss(setPhoneChangeSuccess, 4000);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPhoneChangeServerError(error.message);
      } else {
        setPhoneChangeServerError('Telefon dəyişdirilərkən xəta baş verdi');
      }
    },
  });

  const handleCancelEmailChange = () => {
    setEmailChangeStep('idle');
    emailRequestForm.reset();
    emailConfirmForm.reset();
    setEmailChangeServerError(null);
    setEmailChangeSuccess(null);
  };

  const handleCancelPhoneChange = () => {
    setPhoneChangeStep('idle');
    phoneRequestForm.reset();
    phoneConfirmForm.reset();
    setPhoneChangeServerError(null);
    setPhoneChangeSuccess(null);
  };

  const handleAvatarSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setAvatarError(null);

    if (!ACCEPTED_AVATAR_TYPES.includes(file.type as (typeof ACCEPTED_AVATAR_TYPES)[number])) {
      setAvatarError('Yalnız JPG, PNG və ya WEBP formatı qəbul edilir');
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarError('Şəkil maksimum 1 MB ola bilər');
      return;
    }

    if (!token) {
      setAvatarError('Şəkil yükləmək üçün daxil olun');
      return;
    }

    try {
      const url = await uploadImage(token, file, 'avatars');
      setAvatarPreview(url);
      setAvatarRemoved(false);
    } catch (error) {
      setAvatarError(error instanceof ApiError ? error.message : 'Şəkil yüklənmədi');
    }
  };

  const handleAvatarRemove = () => {
    setAvatarPreview(undefined);
    setAvatarRemoved(true);
    setAvatarError(null);
  };

  if (!hydrated || (!source && isLoading)) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!source) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {isError && error instanceof ApiError
          ? error.message
          : 'Profil məlumatları yüklənmədi. Səhifəni yeniləyin.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Şəxsi məlumatlar</CardTitle>
          <CardDescription>
            Ad, soyad, mobil nömrə, e-poçt, şifrə və profil şəklinizi yeniləyin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            onSubmit={profileForm.handleSubmit((values) => profileMutation.mutate(values))}
            className="space-y-6"
            noValidate
          >
            <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                {avatarPreview && !avatarRemoved ? (
                  <UserAvatarPreview
                    avatarUrl={avatarPreview}
                    firstName={source.firstName}
                    lastName={source.lastName}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <User className="h-10 w-10" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Profil şəkli</p>
                <p className="text-sm text-muted-foreground">
                  JPG, PNG və ya WEBP, maksimum 1 MB.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_AVATAR_TYPES.join(',')}
                    className="hidden"
                    onChange={handleAvatarSelect}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" />
                    Şəkil seç
                  </Button>
                  {(avatarPreview || source.avatarUrl) && !avatarRemoved && (
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-[44px]"
                      onClick={handleAvatarRemove}
                    >
                      <Trash2 className="h-4 w-4" />
                      Şəkli sil
                    </Button>
                  )}
                </div>
                {avatarError && <p className="text-sm text-destructive">{avatarError}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Ad</Label>
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  {...profileForm.register('firstName')}
                />
                {profileForm.formState.errors.firstName && (
                  <p className="text-sm text-destructive">
                    {profileForm.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Soyad</Label>
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  {...profileForm.register('lastName')}
                />
                {profileForm.formState.errors.lastName && (
                  <p className="text-sm text-destructive">
                    {profileForm.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {profileServerError && (
              <p className="text-sm text-destructive">{profileServerError}</p>
            )}
            {profileSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400">{profileSuccess}</p>
            )}

            <Button
              type="submit"
              className="min-h-[44px]"
              disabled={profileMutation.isPending}
            >
              {profileMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saxlanılır...
                </>
              ) : (
                'Dəyişiklikləri saxla'
              )}
            </Button>
          </form>

          <div className="space-y-3 border-t border-border pt-6">
            <div>
              <h3 className="text-base font-semibold">Mobil nömrə</h3>
              <p className="text-sm text-muted-foreground">
                Nömrə dəyişəndə təsdiq kodu cari e-poçtunuza göndərilir.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Label>Cari nömrə</Label>
                {phoneChangeStep === 'idle' && (
                  <p className="mt-1 text-sm">{source.phone || '—'}</p>
                )}
              </div>
              {phoneChangeStep === 'idle' && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px] shrink-0"
                  onClick={() => {
                    setPhoneChangeStep('editing');
                    setPhoneChangeServerError(null);
                    setPhoneChangeSuccess(null);
                    phoneRequestForm.reset({ newPhone: '' });
                  }}
                >
                  Nömrəni dəyiş
                </Button>
              )}
            </div>

            {phoneChangeStep === 'editing' && (
              <form
                onSubmit={phoneRequestForm.handleSubmit((values) =>
                  requestPhoneChangeMutation.mutate(values),
                )}
                className="space-y-3"
                noValidate
              >
                <div className="space-y-2">
                  <Label htmlFor="newPhone">Yeni nömrə</Label>
                  <Controller
                    name="newPhone"
                    control={phoneRequestForm.control}
                    render={({ field }) => (
                      <div
                        className={cn(
                          'flex h-10 w-full overflow-hidden rounded-lg border bg-background transition-colors',
                          'focus-within:border-brand focus-within:ring-2 focus-within:ring-inset focus-within:ring-brand/40',
                          phoneRequestForm.formState.errors.newPhone
                            ? 'border-destructive'
                            : 'border-border',
                        )}
                      >
                        <span
                          className="flex shrink-0 items-center border-r border-border bg-muted/40 px-2.5 text-sm text-muted-foreground select-none sm:px-3"
                          aria-hidden
                        >
                          {AZ_PHONE_PREFIX}
                        </span>
                        <input
                          id="newPhone"
                          type="tel"
                          autoComplete="tel"
                          inputMode="numeric"
                          placeholder="501234567"
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
                          )}
                          aria-invalid={!!phoneRequestForm.formState.errors.newPhone}
                        />
                      </div>
                    )}
                  />
                  {phoneRequestForm.formState.errors.newPhone && (
                    <p className="text-sm text-destructive">
                      {phoneRequestForm.formState.errors.newPhone.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="submit"
                    className="min-h-[44px]"
                    disabled={requestPhoneChangeMutation.isPending}
                  >
                    {requestPhoneChangeMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Göndərilir...
                      </>
                    ) : (
                      'Təsdiq kodu göndər'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px]"
                    onClick={handleCancelPhoneChange}
                  >
                    Ləğv et
                  </Button>
                </div>
              </form>
            )}

            {phoneChangeStep === 'verify' && (
              <form
                onSubmit={phoneConfirmForm.handleSubmit((values) =>
                  confirmPhoneChangeMutation.mutate(values),
                )}
                className="space-y-3"
                noValidate
              >
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {phoneConfirmForm.watch('newPhone')}
                  </span>{' '}
                  üçün e-poçtunuza göndərilən 8 rəqəmli kodu daxil edin.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="phoneVerificationCode">Təsdiq kodu</Label>
                  <Input
                    id="phoneVerificationCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="12345678"
                    maxLength={8}
                    className="max-w-xs tracking-widest"
                    {...phoneConfirmForm.register('code')}
                  />
                  {phoneConfirmForm.formState.errors.code && (
                    <p className="text-sm text-destructive">
                      {phoneConfirmForm.formState.errors.code.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="submit"
                    className="min-h-[44px]"
                    disabled={confirmPhoneChangeMutation.isPending}
                  >
                    {confirmPhoneChangeMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Təsdiq edilir...
                      </>
                    ) : (
                      'Nömrəni təsdiq et'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px]"
                    disabled={requestPhoneChangeMutation.isPending}
                    onClick={() => {
                      const newPhone = phoneConfirmForm.getValues('newPhone');
                      if (newPhone) {
                        requestPhoneChangeMutation.mutate({ newPhone });
                      }
                    }}
                  >
                    Kodu yenidən göndər
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-[44px]"
                    onClick={handleCancelPhoneChange}
                  >
                    Ləğv et
                  </Button>
                </div>
              </form>
            )}

            {phoneChangeServerError && (
              <p className="text-sm text-destructive">{phoneChangeServerError}</p>
            )}
            {phoneChangeSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400">{phoneChangeSuccess}</p>
            )}
          </div>

          <div className="space-y-3 border-t border-border pt-6">
            <div>
              <h3 className="text-base font-semibold">E-poçt ünvanı</h3>
              <p className="text-sm text-muted-foreground">
                Hesabınıza daxil olmaq üçün istifadə edilən e-poçt.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Label htmlFor="email">E-poçt</Label>
                {emailChangeStep === 'idle' && source.email && (
                  <p className="mt-1 text-sm">{source.email}</p>
                )}
              </div>
              {emailChangeStep === 'idle' && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px] shrink-0"
                  onClick={() => {
                    setEmailChangeStep('editing');
                    setEmailChangeServerError(null);
                    setEmailChangeSuccess(null);
                    emailRequestForm.reset({ newEmail: '' });
                  }}
                >
                  E-poçtu dəyiş
                </Button>
              )}
            </div>

            {emailChangeStep === 'editing' && (
              <form
                onSubmit={emailRequestForm.handleSubmit((values) =>
                  requestEmailChangeMutation.mutate(values),
                )}
                className="space-y-3"
                noValidate
              >
                <div className="space-y-2">
                  <Label htmlFor="newEmail">Yeni e-poçt</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    autoComplete="email"
                    placeholder="yeni@example.com"
                    {...emailRequestForm.register('newEmail')}
                  />
                  {emailRequestForm.formState.errors.newEmail && (
                    <p className="text-sm text-destructive">
                      {emailRequestForm.formState.errors.newEmail.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Yeni e-poçt ünvanına 8 rəqəmli təsdiq kodu göndəriləcək.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="submit"
                    className="min-h-[44px]"
                    disabled={requestEmailChangeMutation.isPending}
                  >
                    {requestEmailChangeMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Göndərilir...
                      </>
                    ) : (
                      'Təsdiq kodu göndər'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px]"
                    onClick={handleCancelEmailChange}
                  >
                    Ləğv et
                  </Button>
                </div>
              </form>
            )}

            {emailChangeStep === 'verify' && (
              <form
                onSubmit={emailConfirmForm.handleSubmit((values) =>
                  confirmEmailChangeMutation.mutate(values),
                )}
                className="space-y-3"
                noValidate
              >
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {emailConfirmForm.watch('newEmail')}
                  </span>{' '}
                  ünvanına göndərilən 8 rəqəmli kodu daxil edin.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="verificationCode">Təsdiq kodu</Label>
                  <Input
                    id="verificationCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="12345678"
                    maxLength={8}
                    className="max-w-xs tracking-widest"
                    {...emailConfirmForm.register('code')}
                  />
                  {emailConfirmForm.formState.errors.code && (
                    <p className="text-sm text-destructive">
                      {emailConfirmForm.formState.errors.code.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="submit"
                    className="min-h-[44px]"
                    disabled={confirmEmailChangeMutation.isPending}
                  >
                    {confirmEmailChangeMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Təsdiq edilir...
                      </>
                    ) : (
                      'E-poçtu təsdiq et'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px]"
                    disabled={requestEmailChangeMutation.isPending}
                    onClick={() => {
                      const newEmail = emailConfirmForm.getValues('newEmail');
                      if (newEmail) {
                        requestEmailChangeMutation.mutate({ newEmail });
                      }
                    }}
                  >
                    Kodu yenidən göndər
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-[44px]"
                    onClick={handleCancelEmailChange}
                  >
                    Ləğv et
                  </Button>
                </div>
              </form>
            )}

            {emailChangeServerError && (
              <p className="text-sm text-destructive">{emailChangeServerError}</p>
            )}
            {emailChangeSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400">{emailChangeSuccess}</p>
            )}
          </div>

          <div className="space-y-4 border-t border-border pt-6">
            <div>
              <h3 className="text-base font-semibold">Şifrə</h3>
              <p className="text-sm text-muted-foreground">
                Hesab təhlükəsizliyi üçün güclü şifrə istifadə edin. Tövsiyə: ən azı 10 simvol və
                xüsusi işarə (!@#$).
              </p>
            </div>

            <form
              onSubmit={passwordForm.handleSubmit((values) => passwordMutation.mutate(values))}
              className="space-y-4"
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Cari şifrə</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="pr-10"
                    {...passwordForm.register('currentPassword')}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    aria-label={showCurrentPassword ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Yeni şifrə</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="pr-10"
                      {...passwordForm.register('newPassword')}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      aria-label={showNewPassword ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmNewPassword">Yeni şifrəni təsdiqlə</Label>
                  <div className="relative">
                    <Input
                      id="confirmNewPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="pr-10"
                      {...passwordForm.register('confirmNewPassword')}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={showConfirmPassword ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {passwordForm.formState.errors.confirmNewPassword && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.confirmNewPassword.message}
                    </p>
                  )}
                </div>
              </div>

              {passwordServerError && (
                <p className="text-sm text-destructive">{passwordServerError}</p>
              )}

              <Button
                type="submit"
                className="min-h-[44px]"
                disabled={passwordMutation.isPending}
              >
                {passwordMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Dəyişdirilir...
                  </>
                ) : (
                  'Şifrəni dəyiş'
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Təhlükəli zona</CardTitle>
          <CardDescription>
            Hesabınız deaktiv ediləcək və artıq giriş edə bilməyəcəksiniz. Aktiv
            sifarişiniz varsa, əvvəlcə onları tamamlayın və ya ləğv edin. Bu əməliyyat
            geri qaytarılmır.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={deleteAccountForm.handleSubmit((values) =>
              deleteAccountMutation.mutate(values),
            )}
          >
            <div className="space-y-2">
              <Label htmlFor="delete-password">Şifrə</Label>
              <div className="relative">
                <Input
                  id="delete-password"
                  type={showDeletePassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="pr-10"
                  {...deleteAccountForm.register('password')}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowDeletePassword((v) => !v)}
                  aria-label={showDeletePassword ? 'Şifrəni gizlə' : 'Şifrəni göstər'}
                >
                  {showDeletePassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {deleteAccountForm.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {deleteAccountForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="delete-confirm">Təsdiq (Sil yazın)</Label>
              <Input
                id="delete-confirm"
                autoComplete="off"
                placeholder="Sil"
                {...deleteAccountForm.register('confirmText')}
              />
              {deleteAccountForm.formState.errors.confirmText && (
                <p className="text-sm text-destructive">
                  {deleteAccountForm.formState.errors.confirmText.message}
                </p>
              )}
            </div>

            {deleteServerError && (
              <p className="text-sm text-destructive" role="alert">
                {deleteServerError}
              </p>
            )}

            <Button
              type="submit"
              variant="destructive"
              className="min-h-[44px]"
              disabled={deleteAccountMutation.isPending}
            >
              {deleteAccountMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Silinir...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Hesabı sil
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
