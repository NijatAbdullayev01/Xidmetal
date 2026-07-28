'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  updateProfileSchema,
  changePasswordSchema,
  requestEmailChangeSchema,
  confirmEmailChangeSchema,
  type UpdateProfileInput,
  type ChangePasswordInput,
  type RequestEmailChangeInput,
  type ConfirmEmailChangeInput,
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
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

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
        src={avatarUrl}
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
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((state) => state.updateUser);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileServerError, setProfileServerError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordServerError, setPasswordServerError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailChangeStep, setEmailChangeStep] = useState<'idle' | 'editing' | 'verify'>('idle');
  const [emailChangeSuccess, setEmailChangeSuccess] = useState<string | null>(null);
  const [emailChangeServerError, setEmailChangeServerError] = useState<string | null>(null);

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

  const { data: profile, isLoading } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => api.users.me(token!),
    enabled: !!token,
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
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

  const emailRequestForm = useForm<RequestEmailChangeInput>({
    resolver: zodResolver(requestEmailChangeSchema),
    defaultValues: { newEmail: '' },
  });

  const emailConfirmForm = useForm<ConfirmEmailChangeInput>({
    resolver: zodResolver(confirmEmailChangeSchema),
    defaultValues: { newEmail: '', code: '' },
  });

  useEffect(() => {
    if (!profile) return;

    profileForm.reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone ?? '',
    });
    setAvatarPreview(profile.avatarUrl);
    setAvatarRemoved(false);
    setAvatarError(null);
  }, [profile, profileForm]);

  const profileMutation = useMutation({
    mutationFn: (data: ProfileFormValues) => {
      const payload: ProfileFormValues = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone?.trim() || '',
      };

      if (avatarRemoved) {
        payload.avatarUrl = '';
      } else if (avatarPreview && avatarPreview !== profile?.avatarUrl) {
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
      setPasswordSuccess('Şifrə uğurla dəyişdirildi');
      setPasswordServerError(null);
      autoDismiss(setPasswordSuccess, 4000);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPasswordServerError(error.message);
      } else {
        setPasswordServerError('Şifrə dəyişdirilərkən xəta baş verdi');
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
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      queryClient.setQueryData(['users', 'me'], updatedUser);
      emailRequestForm.reset();
      emailConfirmForm.reset();
      setEmailChangeStep('idle');
      setEmailChangeSuccess('E-poçt ünvanı uğurla dəyişdirildi');
      setEmailChangeServerError(null);
      autoDismiss(setEmailChangeSuccess, 4000);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setEmailChangeServerError(error.message);
      } else {
        setEmailChangeServerError('E-poçt dəyişdirilərkən xəta baş verdi');
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

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarPreview(reader.result);
        setAvatarRemoved(false);
      }
    };
    reader.onerror = () => setAvatarError('Şəkil oxunarkən xəta baş verdi');
    reader.readAsDataURL(file);
  };

  const handleAvatarRemove = () => {
    setAvatarPreview(undefined);
    setAvatarRemoved(true);
    setAvatarError(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Şəxsi məlumatlar</CardTitle>
          <CardDescription>Ad, soyad, mobil nömrə və profil şəklinizi yeniləyin.</CardDescription>
        </CardHeader>
        <CardContent>
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
                    firstName={profile?.firstName}
                    lastName={profile?.lastName}
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
                  {(avatarPreview || profile?.avatarUrl) && !avatarRemoved && (
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

            <div className="space-y-2">
              <Label htmlFor="phone">Mobil nömrə</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+994501234567"
                autoComplete="tel"
                {...profileForm.register('phone')}
              />
              {profileForm.formState.errors.phone && (
                <p className="text-sm text-destructive">
                  {profileForm.formState.errors.phone.message}
                </p>
              )}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>E-poçt ünvanı</CardTitle>
          <CardDescription>Hesabınıza daxil olmaq üçün istifadə edilən e-poçt.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Label htmlFor="email">E-poçt</Label>
                {emailChangeStep === 'idle' && profile?.email && (
                  <p className="mt-1 text-sm">{profile.email}</p>
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
                    Yeni e-poçt ünvanına 6 rəqəmli təsdiq kodu göndəriləcək.
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
                  ünvanına göndərilən 6 rəqəmli kodu daxil edin.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="verificationCode">Təsdiq kodu</Label>
                  <Input
                    id="verificationCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    maxLength={6}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Şifrə</CardTitle>
          <CardDescription>Hesab təhlükəsizliyi üçün güclü şifrə istifadə edin.</CardDescription>
        </CardHeader>
        <CardContent>
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
            {passwordSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400">{passwordSuccess}</p>
            )}

            <Button
              type="submit"
              variant="outline"
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
        </CardContent>
      </Card>
    </div>
  );
}
