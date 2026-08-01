'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import {
  playBookingNotificationSound,
  unlockNotificationAudio,
} from '@/lib/notification-sound';

export const BOOKING_ATTENTION_QUERY_KEY = ['notifications', 'booking-unread-count'] as const;

const POLL_INTERVAL_MS = 8_000;

interface LatestUnreadSnapshot {
  id: string | null;
  at: string | null;
}

export interface UseBookingNotificationsOptions {
  /** Yeni sifariş bildirişində səs çalsın (yalnız bir yerdə true saxlanmalıdır) */
  playSound?: boolean;
}

/**
 * Sifariş hadisələrinin sayını poll edir. `playSound` yalnız qlobal AttentionProvider-də açılır.
 */
export function useBookingNotifications(
  enabled = true,
  options: UseBookingNotificationsOptions = {},
) {
  const { playSound = false } = options;
  const token = useAuthToken();
  const primedRef = useRef(false);
  const latestRef = useRef<LatestUnreadSnapshot>({ id: null, at: null });

  const attentionQuery = useQuery({
    queryKey: BOOKING_ATTENTION_QUERY_KEY,
    queryFn: () => api.notifications.bookingUnreadCount(token!),
    enabled: enabled && !!token,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });

  const data = attentionQuery.data;

  useEffect(() => {
    if (!playSound) return;

    const unlock = () => {
      void unlockNotificationAudio();
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [playSound]);

  useEffect(() => {
    if (!playSound || !data) return;

    const next: LatestUnreadSnapshot = {
      id: data.latestUnreadId ?? null,
      at: data.latestUnreadAt ?? null,
    };

    if (!primedRef.current) {
      latestRef.current = next;
      primedRef.current = true;
      return;
    }

    const prev = latestRef.current;
    const isNewer =
      next.id !== null &&
      next.at !== null &&
      (prev.at === null || new Date(next.at).getTime() > new Date(prev.at).getTime());

    if (isNewer && next.id !== prev.id) {
      void playBookingNotificationSound();
    }

    latestRef.current = next;
  }, [data, playSound]);

  return {
    attentionCount: data?.count ?? 0,
    latestUnreadId: data?.latestUnreadId ?? null,
    latestUnreadAt: data?.latestUnreadAt ?? null,
  };
}
