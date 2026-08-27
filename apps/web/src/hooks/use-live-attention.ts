'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { APP, UserRole } from '@xidmetal/shared';
import {
  BOOKING_ATTENTION_QUERY_KEY,
  useBookingNotifications,
} from '@/hooks/use-booking-notifications';
import {
  UNREAD_MESSAGES_QUERY_KEY,
  useMessageNotifications,
} from '@/hooks/use-message-notifications';
import {
  NOTIFICATIONS_QUERY_KEY,
  UNREAD_NOTIFICATIONS_QUERY_KEY,
  useNotifications,
} from '@/hooks/use-notifications';
import {
  REVIEW_ATTENTION_QUERY_KEY,
  useReviewNotifications,
} from '@/hooks/use-review-notifications';
import {
  SERVICE_ATTENTION_QUERY_KEY,
  useServiceNotifications,
} from '@/hooks/use-service-notifications';
import { useTabAttention } from '@/hooks/use-tab-attention';
import { marketplaceTabPrefix } from '@/lib/tab-attention';
import {
  playAdminNotificationSound,
  playBookingNotificationSound,
  playMessageNotificationSound,
  unlockNotificationAudio,
} from '@/lib/notification-sound';
import {
  bookingAttentionGroupKey,
  dashboardBookingsPath,
  dashboardMessagesPath,
  dashboardNotificationsPath,
  dashboardServicesPath,
  showOsNotification,
  vibrateAttention,
} from '@/lib/live-attention';
import type { LiveToastItem } from '@/components/notifications/live-toast';
import { useAuthStore } from '@/store/auth.store';
import { isNewerAttentionEvent, type AttentionSnapshot } from '@/lib/nav-attention';

const TOAST_TTL_MS = 8_000;

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
    latestTitle: latestBookingTitle,
    latestBody: latestBookingBody,
  } = useBookingNotifications(enabled);
  const {
    unreadCount: announcementCount,
    latestUnreadId: latestAdminId,
    latestUnreadAt: latestAdminAt,
    latestTitle: latestAdminTitle,
  } = useNotifications(enabled);
  const {
    attentionCount: reviewCount,
    latestUnreadAt: latestReviewAt,
    latestTitle: latestReviewTitle,
  } = useReviewNotifications(enabled && role === UserRole.PROVIDER);
  const {
    attentionCount: serviceCount,
    latestUnreadId: latestServiceId,
    latestUnreadAt: latestServiceAt,
    latestTitle: latestServiceTitle,
    latestBody: latestServiceBody,
  } = useServiceNotifications(enabled && role === UserRole.PROVIDER);

  const messagePrimedRef = useRef(false);
  const bookingPrimedRef = useRef(false);
  const adminPrimedRef = useRef(false);
  const servicePrimedRef = useRef(false);
  const lastMessageRef = useRef<AttentionSnapshot>({ id: null, at: null });
  const lastBookingRef = useRef<AttentionSnapshot>({ id: null, at: null });
  const lastAdminRef = useRef<AttentionSnapshot>({ id: null, at: null });
  const lastServiceRef = useRef<AttentionSnapshot>({ id: null, at: null });

  useEffect(() => {
    if (enabled) return;
    messagePrimedRef.current = false;
    bookingPrimedRef.current = false;
    adminPrimedRef.current = false;
    servicePrimedRef.current = false;
    lastMessageRef.current = { id: null, at: null };
    lastBookingRef.current = { id: null, at: null };
    lastAdminRef.current = { id: null, at: null };
    lastServiceRef.current = { id: null, at: null };
    setToasts([]);
  }, [enabled]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((toast: Omit<LiveToastItem, 'id'> & { id?: string }) => {
    const id = toast.id ?? `${toast.kind}-${Date.now()}`;
    setToasts((prev) => {
      const keep =
        toast.kind === 'booking'
          ? prev.filter((item) => item.id !== id)
          : prev.filter((item) => item.kind !== toast.kind);
      return [...keep, { ...toast, id }];
    });
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, TOAST_TTL_MS);
  }, []);

  const refreshRelatedQueries = useCallback(
    (kind: 'message' | 'booking' | 'admin' | 'service') => {
      if (kind === 'message') {
        void queryClient.invalidateQueries({ queryKey: ['conversations'] });
        void queryClient.invalidateQueries({ queryKey: ['conversation'] });
        void queryClient.invalidateQueries({ queryKey: UNREAD_MESSAGES_QUERY_KEY });
      } else if (kind === 'booking') {
        void queryClient.invalidateQueries({ queryKey: ['bookings'] });
        void queryClient.invalidateQueries({ queryKey: BOOKING_ATTENTION_QUERY_KEY });
      } else if (kind === 'service') {
        void queryClient.invalidateQueries({ queryKey: ['services', 'mine'] });
        void queryClient.invalidateQueries({ queryKey: ['users', 'dashboard-stats'] });
        void queryClient.invalidateQueries({ queryKey: SERVICE_ATTENTION_QUERY_KEY });
      } else {
        void queryClient.invalidateQueries({ queryKey: ['users', 'dashboard-stats'] });
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
      void queryClient.invalidateQueries({ queryKey: REVIEW_ATTENTION_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: SERVICE_ATTENTION_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: UNREAD_NOTIFICATIONS_QUERY_KEY });
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [enabled, queryClient]);

  // Yeni mesaj
  useEffect(() => {
    if (!enabled) return;

    const next: AttentionSnapshot = {
      id: latestUnreadMessageId,
      at: latestUnreadAt,
    };

    if (!messagePrimedRef.current) {
      lastMessageRef.current = next;
      messagePrimedRef.current = true;
      return;
    }

    if (!isNewerAttentionEvent(lastMessageRef.current, next)) {
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

    const next: AttentionSnapshot = {
      id: latestBookingId,
      at: latestBookingAt,
    };

    if (!bookingPrimedRef.current) {
      lastBookingRef.current = next;
      bookingPrimedRef.current = true;
      return;
    }

    if (!isNewerAttentionEvent(lastBookingRef.current, next)) {
      lastBookingRef.current = next;
      return;
    }

    lastBookingRef.current = next;
    void playBookingNotificationSound();
    vibrateAttention('booking');
    refreshRelatedQueries('booking');

    const href = dashboardBookingsPath(role);
    const bookingHeadline = latestBookingTitle?.trim() || 'Yeni sifariş bildirişi';
    const bookingBody =
      latestBookingBody?.trim() ||
      'Yeni sifariş və ya status dəyişikliyi var. Kabinetdən baxın.';
    const bookingGroupKey = bookingAttentionGroupKey(
      latestBookingTitle,
      latestBookingBody,
      next.id,
    );
    pushToast({
      id: bookingGroupKey,
      kind: 'booking',
      title: bookingHeadline,
      body: bookingBody,
      href,
    });

    const tabHidden =
      typeof document !== 'undefined' && document.visibilityState === 'hidden';
    if (tabHidden) {
      showOsNotification({
        title: bookingHeadline,
        body: bookingBody,
        tag: bookingGroupKey,
      });
    }
  }, [
    enabled,
    latestBookingId,
    latestBookingAt,
    latestBookingTitle,
    latestBookingBody,
    role,
    pushToast,
    refreshRelatedQueries,
  ]);

  // Admin / platforma elanı (xidmət yoxlaması buraya düşmür)
  useEffect(() => {
    if (!enabled) return;

    const next: AttentionSnapshot = {
      id: latestAdminId,
      at: latestAdminAt,
    };

    if (!adminPrimedRef.current) {
      lastAdminRef.current = next;
      adminPrimedRef.current = true;
      return;
    }

    if (!isNewerAttentionEvent(lastAdminRef.current, next)) {
      lastAdminRef.current = next;
      return;
    }

    lastAdminRef.current = next;
    void playAdminNotificationSound();
    vibrateAttention('admin');
    refreshRelatedQueries('admin');

    const href = dashboardNotificationsPath(role);
    const announcementHeadline = latestAdminTitle?.trim() || 'Yeni bildiriş';
    pushToast({
      id: `admin-${next.id}`,
      kind: 'admin',
      title: announcementHeadline,
      body: 'Sizə yeni platforma bildirişi gəldi.',
      href,
    });

    const tabHidden =
      typeof document !== 'undefined' && document.visibilityState === 'hidden';
    if (tabHidden) {
      showOsNotification({
        title: announcementHeadline,
        body: 'Kabinetinizdə yeni bildiriş var.',
        tag: `admin-${next.id}`,
      });
    }
  }, [
    enabled,
    latestAdminId,
    latestAdminAt,
    latestAdminTitle,
    role,
    pushToast,
    refreshRelatedQueries,
  ]);

  // Xidmət təsdiqi / düzəliş — Xidmətlərim
  useEffect(() => {
    if (!enabled || role !== UserRole.PROVIDER) return;

    const next: AttentionSnapshot = {
      id: latestServiceId,
      at: latestServiceAt,
    };

    if (!servicePrimedRef.current) {
      lastServiceRef.current = next;
      servicePrimedRef.current = true;
      return;
    }

    if (!isNewerAttentionEvent(lastServiceRef.current, next)) {
      lastServiceRef.current = next;
      return;
    }

    lastServiceRef.current = next;
    void playAdminNotificationSound();
    vibrateAttention('service');
    refreshRelatedQueries('service');

    const href = dashboardServicesPath();
    const serviceHeadline = latestServiceTitle?.trim() || 'Xidmət yeniləməsi';
    pushToast({
      id: `service-${next.id}`,
      kind: 'service',
      title: serviceHeadline,
      body:
        latestServiceBody?.trim() ||
        'Xidmətinizin statusu dəyişdi. Xidmətlərim bölməsindən baxın.',
      href,
    });

    const tabHidden =
      typeof document !== 'undefined' && document.visibilityState === 'hidden';
    if (tabHidden) {
      showOsNotification({
        title: serviceHeadline,
        body: 'Xidmətlərim bölməsində yeni bildiriş var.',
        tag: `service-${next.id}`,
      });
    }
  }, [
    enabled,
    role,
    latestServiceId,
    latestServiceAt,
    latestServiceTitle,
    latestServiceBody,
    pushToast,
    refreshRelatedQueries,
  ]);

  const tabAttentionLabel = useMemo(
    () =>
      marketplaceTabPrefix({
        messages: { count: unreadCount, at: latestUnreadAt },
        bookings: {
          count: attentionCount,
          at: latestBookingAt,
          latestTitle: latestBookingTitle,
        },
        reviews: {
          count: reviewCount,
          at: latestReviewAt,
          latestTitle: latestReviewTitle,
        },
        announcements: {
          count: announcementCount,
          at: latestAdminAt,
          latestTitle: latestAdminTitle,
        },
        services: {
          count: serviceCount,
          at: latestServiceAt,
          latestTitle: latestServiceTitle,
        },
      }),
    [
      unreadCount,
      latestUnreadAt,
      attentionCount,
      latestBookingAt,
      latestBookingTitle,
      reviewCount,
      latestReviewAt,
      latestReviewTitle,
      announcementCount,
      latestAdminAt,
      latestAdminTitle,
      serviceCount,
      latestServiceAt,
      latestServiceTitle,
    ],
  );

  useTabAttention({
    enabled,
    attentionLabel: tabAttentionLabel,
    fallbackTitle: APP.name,
  });

  return { toasts, dismissToast };
}
