'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bell, Loader2 } from 'lucide-react';
import { DevicePlatform } from '@xidmetal/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { requestNotificationPermission } from '@/lib/live-attention';
import { blockedNotificationSteps } from '@/lib/notification-permission';
import { isWebPushConfigured, registerWebPushToken } from '@/lib/web-push';

type PermissionUi = 'unknown' | 'default' | 'granted' | 'denied' | 'unsupported';

/**
 * Brauzer bildiriş icazəsi + (konfiqurasiya varsa) FCM push qeydiyyatı.
 * FCM yoxdursa belə Notification icazəsi düyməsi görünür.
 */
export function PushNotificationsCard() {
  const token = useAuthToken();
  const [permission, setPermission] = useState<PermissionUi>('unknown');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fcmConfigured = isWebPushConfigured();

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const enableMutation = useMutation({
    mutationFn: async () => {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        throw new Error('Bu brauzer bildirişləri dəstəkləmir');
      }

      const next = await requestNotificationPermission();
      if (next !== 'granted') {
        throw new Error(`Bildiriş icazəsi verilmədi. ${blockedNotificationSteps()}`);
      }

      if (!fcmConfigured) {
        return { mode: 'permission' as const };
      }

      if (!token) throw new Error('Sessiya tapılmadı');
      const pushToken = await registerWebPushToken();
      if (!pushToken) {
        throw new Error('Brauzer push tokeni alına bilmədi');
      }
      await api.devices.registerToken(token, {
        token: pushToken,
        platform: DevicePlatform.WEB,
      });
      return { mode: 'push' as const };
    },
    onSuccess: (result) => {
      setError(null);
      setPermission('granted');
      setMessage(
        result.mode === 'push'
          ? 'Push bildirişləri aktivləşdirildi.'
          : 'Brauzer bildirişləri aktivləşdirildi.',
      );
    },
    onError: (err: unknown) => {
      setMessage(null);
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermission(Notification.permission);
      }
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Bildirişlər aktivləşdirilmədi',
      );
    },
  });

  const buttonLabel =
    permission === 'granted'
      ? fcmConfigured
        ? 'Push yenidən aktivləşdir'
        : 'Bildirişlər aktivdir'
      : 'Bildirişlərə icazə ver';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" aria-hidden />
          Bildirişlər
        </CardTitle>
        <CardDescription>
          {fcmConfigured
            ? 'Sifariş və platforma hadisələri üçün brauzer bildirişləri (FCM).'
            : 'Sifariş və mesajlar üçün brauzer bildirişləri.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          type="button"
          className="min-h-[44px] w-full sm:w-auto"
          disabled={
            enableMutation.isPending ||
            permission === 'unsupported' ||
            (permission === 'granted' && !fcmConfigured) ||
            (fcmConfigured && !token)
          }
          onClick={() => enableMutation.mutate()}
        >
          {enableMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Aktivləşdirilir…
            </>
          ) : (
            buttonLabel
          )}
        </Button>
        {permission === 'denied' ? (
          <p className="text-sm text-muted-foreground">{blockedNotificationSteps()}</p>
        ) : null}
        {permission === 'unsupported' ? (
          <p className="text-sm text-muted-foreground">
            Bu mühitdə brauzer bildirişləri dəstəklənmir.
          </p>
        ) : null}
        {message ? (
          <p className="text-sm text-foreground" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
