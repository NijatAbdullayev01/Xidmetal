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
  deleteAccountSchema,
  UserRole,
  AZERBAIJAN_LOCATIONS,
  type UpdateProfileInput,
  type ChangePasswordInput,
  type RequestEmailChangeInput,
  type ConfirmEmailChangeInput,
  type DeleteAccountInput,
  type UserProfile,
} from '@xidmetal/shared';
import {
  Camera,
  Download,
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
import { Textarea } from '@/components/ui/textarea';
import { LocationPicker } from '@/components/ui/location-picker';
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
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordServerError, setPasswordServerError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
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
      phone: authUser?.phone ?? '',
      bio: authUser?.providerProfile?.bio ?? '',
      location: authUser?.providerProfile?.location ?? '',
      experience: authUser?.providerProfile?.experience ?? undefined,
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

  useEffect(() => {
    if (!source) return;

    profileForm.reset({
      firstName: source.firstName,
      lastName: source.lastName,
      phone: source.phone ?? '',
      bio: source.providerProfile?.bio ?? '',
      location: source.providerProfile?.location ?? '',
      experience: source.providerProfile?.experience ?? undefined,
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
        phone: data.phone?.trim() || '',
      };

      if (source?.role === UserRole.PROVIDER) {
        payload.bio = data.bio?.trim() ?? '';
        payload.location = data.location?.trim() ?? '';
        if (typeof data.experience === 'number') {
          payload.experience = data.experience;
        }
      }

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

  const exportDataMutation = useMutation({
    mutationFn: () => api.users.exportData(token!),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const day = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `xidmetal-export-${day}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportError(null);
      setExportSuccess('Məlumatlar endirildi');
      autoDismiss(setExportSuccess, 4000);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setExportError(error.message);
      } else {
        setExportError('Məlumatlar endirilmədi');
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

            <div className="space-y-2">
              <Label htmlFor="phone">Mobil nömrə</Label>
              <Controller
                name="phone"
                control={profileForm.control}
                render={({ field }) => (
                  <div
                    className={cn(
                      'flex h-10 w-full overflow-hidden rounded-lg border bg-background transition-colors',
                      'focus-within:border-brand focus-within:ring-2 focus-within:ring-inset focus-within:ring-brand/40',
                      profileForm.formState.errors.phone ? 'border-destructive' : 'border-border',
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
                      aria-invalid={!!profileForm.formState.errors.phone}
                    />
                  </div>
                )}
              />
              {profileForm.formState.errors.phone && (
                <p className="text-sm text-destructive">
                  {profileForm.formState.errors.phone.message}
                </p>
              )}
              {source.phone?.trim() ? (
                <PhoneVerifyBlock
                  phoneVerifiedAt={source.phoneVerifiedAt}
                  onVerified={(profile) => {
                    updateUser(profile);
                    void queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
                  }}
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Status SMS üçün mobil nömrə əlavə edib təsdiqləyin.
                </p>
              )}
            </div>

            {source.role === UserRole.PROVIDER ? (
              <div className="space-y-4 border-t border-border pt-6">
                <div>
                  <h3 className="text-sm font-semibold">Xidmət verən profili</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Bio, təcrübə və əsas fəaliyyət ünvanınız müştərilərə görünür.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    rows={4}
                    placeholder="Özünüz və xidmətləriniz haqqında qısa məlumat yazın..."
                    error={!!profileForm.formState.errors.bio}
                    {...profileForm.register('bio')}
                  />
                  {profileForm.formState.errors.bio && (
                    <p className="text-sm text-destructive">
                      {profileForm.formState.errors.bio.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="experience">Təcrübə (il)</Label>
                    <Input
                      id="experience"
                      type="number"
                      min={0}
                      max={50}
                      inputMode="numeric"
                      {...profileForm.register('experience', {
                        setValueAs: (value) => {
                          if (value === '' || value === null || value === undefined) {
                            return undefined;
                          }
                          const parsed = Number(value);
                          return Number.isFinite(parsed) ? parsed : undefined;
                        },
                      })}
                    />
                    {profileForm.formState.errors.experience && (
                      <p className="text-sm text-destructive">
                        {profileForm.formState.errors.experience.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Əsas ünvan</Label>
                    <LocationPicker
                      id="location"
                      value={profileForm.watch('location') ?? ''}
                      onChange={(location) =>
                        profileForm.setValue('location', location, {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                      error={!!profileForm.formState.errors.location}
                      extraOptions={
                        source.providerProfile?.location &&
                        !AZERBAIJAN_LOCATIONS.includes(source.providerProfile.location)
                          ? [source.providerProfile.location]
                          : undefined
                      }
                    />
                    {profileForm.formState.errors.location && (
                      <p className="text-sm text-destructive">
                        {profileForm.formState.errors.location.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

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

      <Card>
        <CardHeader>
          <CardTitle>Məlumatlarım</CardTitle>
          <CardDescription>
            Hesabınız, sifarişləriniz və bildirişləriniz haqqında JSON faylı endirin
            (GDPR / məlumat ixracı).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {exportError && (
            <p className="text-sm text-destructive" role="alert">
              {exportError}
            </p>
          )}
          {exportSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400">{exportSuccess}</p>
          )}
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            disabled={exportDataMutation.isPending || !token}
            onClick={() => exportDataMutation.mutate()}
          >
            {exportDataMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Hazırlanır...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Məlumatlarımı yüklə
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Təhlükəli zona</CardTitle>
          <CardDescription>
            Hesabınız soft-delete olunacaq. Aktiv sifarişiniz varsa əvvəlcə onları tamamlayın
            və ya ləğv edin. Bu əməliyyat geri qaytarılmır.
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
              <Label htmlFor="delete-confirm">Təsdiq (SIL yazın)</Label>
              <Input
                id="delete-confirm"
                autoComplete="off"
                placeholder="SIL"
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

function PhoneVerifyBlock({
  phoneVerifiedAt,
  onVerified,
}: {
  phoneVerifiedAt?: string | null;
  onVerified: (profile: UserProfile) => void;
}) {
  const token = useAuthToken();
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'idle' | 'code'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error('Sessiya tapılmadı');
      return api.users.requestPhoneVerify(token);
    },
    onSuccess: (res) => {
      setError(null);
      setMessage(res.message);
      if (res.alreadyVerified) {
        setStep('idle');
        return;
      }
      setStep('code');
      if (res.previewCode) {
        setCode(res.previewCode);
      }
    },
    onError: (err: unknown) => {
      setMessage(null);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Kod göndərilmədi',
      );
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error('Sessiya tapılmadı');
      return api.users.confirmPhoneVerify(token, { code: code.trim() });
    },
    onSuccess: (profile) => {
      setError(null);
      setMessage('Telefon təsdiqləndi.');
      setStep('idle');
      onVerified(profile);
    },
    onError: (err: unknown) => {
      setMessage(null);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Təsdiq uğursuz',
      );
    },
  });

  if (phoneVerifiedAt) {
    return (
      <p className="text-xs text-muted-foreground">
        Mobil nömrə təsdiqlənib — status SMS göndərilə bilər.
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">
        Status SMS üçün nömrəni SMS kodu ilə təsdiqləyin.
      </p>
      {step === 'idle' ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] w-full sm:w-auto"
          disabled={requestMutation.isPending || !token}
          onClick={() => requestMutation.mutate()}
        >
          {requestMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Göndərilir…
            </>
          ) : (
            'SMS təsdiq kodu göndər'
          )}
        </Button>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1">
            <Label htmlFor="phone-verify-code">Təsdiq kodu</Label>
            <Input
              id="phone-verify-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>
          <Button
            type="button"
            className="min-h-[44px]"
            disabled={confirmMutation.isPending || code.length !== 6}
            onClick={() => confirmMutation.mutate()}
          >
            {confirmMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              'Təsdiqlə'
            )}
          </Button>
        </div>
      )}
      {message && (
        <p className="text-xs text-muted-foreground" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
