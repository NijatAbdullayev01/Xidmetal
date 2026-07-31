'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Loader2 } from 'lucide-react';
import { NotificationType, UserRole } from '@xidmetal/shared';
import type { NotificationSummary } from '@xidmetal/shared';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import {
  NOTIFICATIONS_QUERY_KEY,
  UNREAD_NOTIFICATIONS_QUERY_KEY,
  useNotifications,
} from '@/hooks/use-notifications';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

function resolveNotificationHref(
  notification: NotificationSummary,
  role: UserRole | undefined,
): string | null {
  const base =
    role === UserRole.PROVIDER ? '/dashboard/provider' : '/dashboard/customer';
  const data = notification.data ?? {};
  const conversationId =
    typeof data.conversationId === 'string' ? data.conversationId : null;

  if (notification.type === NotificationType.MESSAGE_RECEIVED && conversationId) {
    return `${base}/messages?conversationId=${conversationId}`;
  }

  if (
    notification.type.startsWith('BOOKING_') ||
    notification.type === NotificationType.BOOKING_RESCHEDULE_PROPOSED
  ) {
    return `${base}/bookings`;
  }

  if (notification.type === NotificationType.REVIEW_RECEIVED) {
    return role === UserRole.PROVIDER ? '/dashboard/provider/ratings' : base;
  }

  return null;
}

export function NotificationsBell() {
  const token = useAuthToken();
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { unreadCount } = useNotifications(!!user);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => api.notifications.list(token!, { limit: '15' }),
    enabled: !!token && open,
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

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const handleOpenNotification = (notification: NotificationSummary) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    const href = resolveNotificationHref(notification, user?.role);
    setOpen(false);
    if (href) {
      router.push(href);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md hover:bg-muted"
        aria-label="Bildirişlər"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-brand-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-medium">Bildirişlər</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={unreadCount === 0 || markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
            >
              Hamısını oxu
            </Button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-brand" />
              </div>
            )}
            {!isLoading && (data?.items.length ?? 0) === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Bildiriş yoxdur
              </p>
            )}
            {data?.items.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleOpenNotification(notification)}
                className={cn(
                  'flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-muted/60',
                  !notification.isRead && 'bg-brand/5',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{notification.title}</p>
                  {!notification.isRead && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />
                  )}
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {notification.body}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(notification.createdAt).toLocaleString('az-AZ', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
