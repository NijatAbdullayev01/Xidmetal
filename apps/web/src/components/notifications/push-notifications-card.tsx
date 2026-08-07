'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bell, Loader2 } from 'lucide-react';
import { DevicePlatform } from '@xidmetal/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { isWebPushConfigured, registerWebPushToken } from '@/lib/web-push';

/**
 * FCM / VAPID konfiqurasiyası yoxdursa gizlədilir (graceful).
 */
export function PushNotificationsCard() {
  const token = useAuthToken();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const configured = isWebPushConfigured();

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Sessiya tapılmadı');
      const pushToken = await registerWebPushToken();
      if (!pushToken) {
        throw new Error('Brauzer push tokeni alına bilmədi');
      }
      return api.devices.registerToken(token, {
        token: pushToken,
        platform: DevicePlatform.WEB,
      });
    },
    onSuccess: () => {
      setError(null);
      setMessage('Push bildirişləri aktivləşdirildi.');
    },
    onError: (err: unknown) => {
      setMessage(null);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Push aktivləşdirilmədi',
      );
    },
  });

  if (!configured) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" aria-hidden />
          Bildirişlər
        </CardTitle>
        <CardDescription>
          Sifariş və platforma hadisələri üçün brauzer push bildirişləri (FCM).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          type="button"
          className="min-h-[44px] w-full sm:w-auto"
          disabled={registerMutation.isPending || !token}
          onClick={() => registerMutation.mutate()}
        >
          {registerMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Aktivləşdirilir…
            </>
          ) : (
            'Push bildirişləri aktivləşdir'
          )}
        </Button>
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
