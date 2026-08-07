'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Loader2 } from 'lucide-react';
import type { NotificationSummary } from '@xidmetal/shared';
import { UserRole } from '@xidmetal/shared';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import {
  NOTIFICATIONS_QUERY_KEY,
  UNREAD_NOTIFICATIONS_QUERY_KEY,
} from '@/hooks/use-notifications';
import { resolveNotificationHref } from '@/lib/notification-href';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function NotificationsInbox() {
  const token = useAuthToken();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, 'inbox'],
    queryFn: () => api.notifications.list(token!, { limit: '50' }),
    enabled: !!token,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => {
      if (!token) throw new Error('Autentifikasiya tələb olunur');
      return api.notifications.markRead(token, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: UNREAD_NOTIFICATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error('Autentifikasiya tələb olunur');
      return api.notifications.markAllRead(token);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: UNREAD_NOTIFICATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });

  const handleOpen = (notification: NotificationSummary) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    const role = user?.role ?? UserRole.CUSTOMER;
    const href = resolveNotificationHref(notification, role);
    if (href) router.push(href);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bildirişlər</h1>
          <p className="mt-1 text-muted-foreground">
            Admin və platforma tərəfindən göndərilən elanlar. Sifariş və mesaj
            bildirişləri buraya düşmür — müvafiq bölmələrdə göstərilir.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px]"
          disabled={!data?.items.some((n) => !n.isRead) || markAllMutation.isPending}
          onClick={() => markAllMutation.mutate()}
        >
          {markAllMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          Hamısını oxu
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center px-4 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden />
          </div>
        ) : isError ? (
          <p className="px-4 py-12 text-center text-sm text-destructive">
            Bildirişlər yüklənmədi. Səhifəni yeniləyin.
          </p>
        ) : !data?.items.length ? (
          <div className="flex flex-col items-center px-4 py-16 text-center">
            <Bell className="h-10 w-10 text-muted-foreground/40" aria-hidden />
            <p className="mt-4 text-sm text-muted-foreground">Bildiriş yoxdur</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data.items.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => handleOpen(notification)}
                  className={cn(
                    'flex w-full flex-col gap-1 px-4 py-4 text-left transition-colors hover:bg-muted/60 sm:px-5',
                    !notification.isRead && 'bg-brand/5',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium sm:text-base">{notification.title}</p>
                    {!notification.isRead ? (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleString('az-AZ', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
