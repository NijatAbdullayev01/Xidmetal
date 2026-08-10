'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  BOOKING_ATTENTION_QUERY_KEY,
  useBookingNotifications,
} from '@/hooks/use-booking-notifications';
import {
  UNREAD_MESSAGES_QUERY_KEY,
  useMessageNotifications,
} from '@/hooks/use-message-notifications';
import { NOTIFICATIONS_QUERY_KEY, UNREAD_NOTIFICATIONS_QUERY_KEY } from '@/hooks/use-notifications';
import { useTabAttention } from '@/hooks/use-tab-attention';
import {
  playBookingNotificationSound,
  playMessageNotificationSound,
  unlockNotificationAudio,
} from '@/lib/notification-sound';
import {
  dashboardBookingsPath,
  dashboardMessagesPath,
  showOsNotification,
  vibrateAttention,
} from '@/lib/live-attention';
import type { LiveToastItem } from '@/components/notifications/live-toast';
import { useAuthStore } from '@/store/auth.store';

const TOAST_TTL_MS = 8_000;

interface LatestSnapshot {
  id: string | null;
  at: string | null;
}

function isNewerEvent(prev: LatestSnapshot, next: LatestSnapshot): boolean {
  return (
    next.id !== null &&
    next.at !== null &&
    next.id !== prev.id &&
    (prev.at === null || new Date(next.at).getTime() > new Date(prev.at).getTime())
  );
}

/**
 * Autentifikasiya olunmuş istifadəçi üçün canlı diqqət:
 * səs, vibrasiya, in-app toast, OS bildirişi, tab title və query yeniləməsi.
 */
export function useLiveAttention(enabled: boolean) {
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.user?.role);
  const [toasts, setToasts] = useState<LiveToastItem[]>([]);

  const { unreadCount, latestUnreadMessageId, latestUnreadAt } = useMessageNotifications(enabled);
  const {
    attentionCount,
    latestUnreadId: latestBookingId,
    latestUnreadAt: latestBookingAt,
  } = useBookingNotifications(enabled);

  const messagePrimedRef = useRef(false);
  const bookingPrimedRef = useRef(false);
  const lastMessageRef = useRef<LatestSnapshot>({ id: null, at: null });
  const lastBookingRef = useRef<LatestSnapshot>({ id: null, at: null });

  useEffect(() => {
    if (enabled) return;
    messagePrimedRef.current = false;
    bookingPrimedRef.current = false;
    lastMessageRef.current = { id: null, at: null };
    lastBookingRef.current = { id: null, at: null };
    setToasts([]);
  }, [enabled]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((toast: Omit<LiveToastItem, 'id'> & { id?: string }) => {
    const id = toast.id ?? `${toast.kind}-${Date.now()}`;
    setToasts((prev) => [...prev.filter((item) => item.kind !== toast.kind), { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, TOAST_TTL_MS);
  }, []);

  const refreshRelatedQueries = useCallback(
    (kind: 'message' | 'booking') => {
      if (kind === 'message') {
        void queryClient.invalidateQueries({ queryKey: ['conversations'] });
        void queryClient.invalidateQueries({ queryKey: ['conversation'] });
        void queryClient.invalidateQueries({ queryKey: UNREAD_MESSAGES_QUERY_KEY });
      } else {
        void queryClient.invalidateQueries({ queryKey: ['bookings'] });
        void queryClient.invalidateQueries({ queryKey: BOOKING_ATTENTION_QUERY_KEY });
      }
      void queryClient.invalidateQueries({ queryKey: UNREAD_NOTIFICATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
    [queryClient],
  );

  // Audio unlock — ilk istifadəçi jestində (icazə dialoqu yalnız «İcazə ver» düyməsindən)
  useEffect(() => {
    if (!enabled) return;

    const unlock = () => {
      void unlockNotificationAudio();
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [enabled]);

  // Tab yenidən görünəndə dərhal yoxla
  useEffect(() => {
    if (!enabled) return;

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      void queryClient.invalidateQueries({ queryKey: UNREAD_MESSAGES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: BOOKING_ATTENTION_QUERY_KEY });
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [enabled, queryClient]);

  // Yeni mesaj
  useEffect(() => {
    if (!enabled) return;

    const next: LatestSnapshot = {
      id: latestUnreadMessageId,
      at: latestUnreadAt,
    };

    if (!messagePrimedRef.current) {
      lastMessageRef.current = next;
      messagePrimedRef.current = true;
      return;
    }

    if (!isNewerEvent(lastMessageRef.current, next)) {
      lastMessageRef.current = next;
      return;
    }

    lastMessageRef.current = next;
    void playMessageNotificationSound();
    vibrateAttention('message');
    refreshRelatedQueries('message');

    const href = dashboardMessagesPath(role);
    pushToast({
      id: `message-${next.id}`,
      kind: 'message',
      title: 'Yeni mesaj',
      body: 'Sizə yeni mesaj gəldi. Dərhal cavab verə bilərsiniz.',
      href,
    });

    const tabHidden =
      typeof document !== 'undefined' && document.visibilityState === 'hidden';
    if (tabHidden) {
      showOsNotification({
        title: 'Yeni mesaj',
        body: 'Sizə yeni mesaj gəldi. Kabinetinizdən oxuya bilərsiniz.',
        tag: `message-${next.id}`,
      });
    }
  }, [
    enabled,
    latestUnreadMessageId,
    latestUnreadAt,
    role,
    pushToast,
    refreshRelatedQueries,
  ]);

  // Yeni sifariş / sifariş hadisəsi
  useEffect(() => {
    if (!enabled) return;

    const next: LatestSnapshot = {
      id: latestBookingId,
      at: latestBookingAt,
    };

    if (!bookingPrimedRef.current) {
      lastBookingRef.current = next;
      bookingPrimedRef.current = true;
      return;
    }

    if (!isNewerEvent(lastBookingRef.current, next)) {
      lastBookingRef.current = next;
      return;
    }

    lastBookingRef.current = next;
    void playBookingNotificationSound();
    vibrateAttention('booking');
    refreshRelatedQueries('booking');

    const href = dashboardBookingsPath(role);
    pushToast({
      id: `booking-${next.id}`,
      kind: 'booking',
      title: 'Yeni sifariş bildirişi',
      body: 'Yeni sifariş və ya status dəyişikliyi var. Kabinetdən baxın.',
      href,
    });

    const tabHidden =
      typeof document !== 'undefined' && document.visibilityState === 'hidden';
    if (tabHidden) {
      showOsNotification({
        title: 'Yeni sifariş',
        body: 'Yeni sifariş bildirişiniz var. Kabinetinizdən baxa bilərsiniz.',
        tag: `booking-${next.id}`,
      });
    }
  }, [enabled, latestBookingId, latestBookingAt, role, pushToast, refreshRelatedQueries]);

  useTabAttention({
    enabled,
    unreadMessages: unreadCount,
    bookingAttention: attentionCount,
  });

  return { toasts, dismissToast };
}
