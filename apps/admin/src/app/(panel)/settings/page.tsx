'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  updateProfileSchema,
  changePasswordSchema,
  type UpdateProfileInput,
  type ChangePasswordInput,
} from '@xidmetal/shared';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useAuthStore } from '@/store/auth.store';

export default function AdminSettingsPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => api.users.me(token!),
    enabled: !!token,
  });

  const profileForm = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { firstName: '', lastName: '' },
  });

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  });

  useEffect(() => {
    if (!profile) return;
    profileForm.reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
    });
  }, [profile, profileForm]);

  const saveProfile = useMutation({
    mutationFn: (data: UpdateProfileInput) => api.users.updateProfile(token!, data),
    onSuccess: async (user) => {
      setProfileErr(null);
      setProfileMsg('Profil yeniləndi');
      updateUser(user);
      await queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
    onError: (err: unknown) => {
      setProfileMsg(null);
      setProfileErr(err instanceof ApiError ? err.message : 'Saxlama uğursuz oldu');
    },
  });

  const savePassword = useMutation({
    mutationFn: (data: ChangePasswordInput) => api.users.changePassword(token!, data),
    onSuccess: () => {
      setPasswordErr(null);
      setPasswordMsg('Şifrə dəyişdirildi');
      passwordForm.reset();
    },
    onError: (err: unknown) => {
      setPasswordMsg(null);
      setPasswordErr(err instanceof ApiError ? err.message : 'Şifrə dəyişmədi');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tənzimləmələr</h1>
        <p className="mt-1 text-muted-foreground">Admin profil və şifrə</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>Ad və soyad</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={profileForm.handleSubmit((v) => saveProfile.mutate(v))}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Ad</Label>
                <Input id="firstName" {...profileForm.register('firstName')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Soyad</Label>
                <Input id="lastName" {...profileForm.register('lastName')} />
              </div>
            </div>
            {profileErr && <p className="text-sm text-destructive">{profileErr}</p>}
            {profileMsg && <p className="text-sm text-success">{profileMsg}</p>}
            <Button type="submit" disabled={saveProfile.isPending} className="min-h-[44px]">
              {saveProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Saxla'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Şifrə</CardTitle>
          <CardDescription>Hesab şifrəsini dəyişin</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={passwordForm.handleSubmit((v) => savePassword.mutate(v))}
          >
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Cari şifrə</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  className="pr-10"
                  {...passwordForm.register('currentPassword')}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
                  onClick={() => setShowCurrent((v) => !v)}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Yeni şifrə</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  className="pr-10"
                  {...passwordForm.register('newPassword')}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
                  onClick={() => setShowNew((v) => !v)}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Yeni şifrə (təkrar)</Label>
              <Input
                id="confirmNewPassword"
                type="password"
                {...passwordForm.register('confirmNewPassword')}
              />
            </div>
            {passwordErr && <p className="text-sm text-destructive">{passwordErr}</p>}
            {passwordMsg && <p className="text-sm text-success">{passwordMsg}</p>}
            <Button type="submit" disabled={savePassword.isPending} className="min-h-[44px]">
              {savePassword.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
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
