'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Loader2 } from 'lucide-react';
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

const PANEL_WIDTH_PX = 352; // 22rem
const VIEWPORT_GAP_PX = 16;
const PANEL_OFFSET_Y_PX = 8;

interface PanelPosition {
  top: number;
  left: number;
}

function computePanelPosition(trigger: DOMRect): PanelPosition {
  const maxWidth = Math.min(PANEL_WIDTH_PX, window.innerWidth - VIEWPORT_GAP_PX * 2);
  const spaceOnRight = window.innerWidth - trigger.left - VIEWPORT_GAP_PX;
  const alignLeft = spaceOnRight >= maxWidth || trigger.left < window.innerWidth / 2;

  let left = alignLeft ? trigger.left : trigger.right - maxWidth;
  left = Math.max(
    VIEWPORT_GAP_PX,
    Math.min(left, window.innerWidth - maxWidth - VIEWPORT_GAP_PX),
  );

  return {
    top: trigger.bottom + PANEL_OFFSET_Y_PX,
    left,
  };
}

export function NotificationsBell() {
  const token = useAuthToken();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { unreadCount } = useNotifications(!!user);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
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
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPosition(null);
      return;
    }

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPanelPosition(computePanelPosition(rect));
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleOpenNotification = (notification: NotificationSummary) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    setOpen(false);
  };

  const panel =
    open &&
    mounted &&
    panelPosition &&
    createPortal(
      <div
        ref={panelRef}
        className="fixed z-50 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        style={{ top: panelPosition.top, left: panelPosition.left }}
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-medium">Platforma bildirişləri</p>
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
              Platforma bildirişi yoxdur
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
      </div>,
      document.body,
    );

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md hover:bg-muted"
        aria-label="Platforma bildirişləri"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-brand-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {panel}
    </div>
  );
}
