'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import {
  playMessageNotificationSound,
  unlockNotificationAudio,
} from '@/lib/notification-sound';

export const UNREAD_MESSAGES_QUERY_KEY = ['messages', 'unread-count'] as const;

const POLL_INTERVAL_MS = 5_000;

interface LatestUnreadSnapshot {
  id: string | null;
  at: string | null;
}

/**
 * Kabinetdə oxunmamış mesaj sayını poll edir, badge üçün count qaytarır
 * və yeni mesaj gələndə səsli bildiriş çalır.
 */
export function useMessageNotifications(enabled = true) {
  const token = useAuthToken();
  const primedRef = useRef(false);
  const latestRef = useRef<LatestUnreadSnapshot>({ id: null, at: null });

  const { data } = useQuery({
    queryKey: UNREAD_MESSAGES_QUERY_KEY,
    queryFn: () => api.messages.unreadCount(token!),
    enabled: enabled && !!token,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });

  useEffect(() => {
    const unlock = () => {
      void unlockNotificationAudio();
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (!data) return;

    const next: LatestUnreadSnapshot = {
      id: data.latestUnreadMessageId,
      at: data.latestUnreadAt,
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
      void playMessageNotificationSound();
    }

    latestRef.current = next;
  }, [data]);

  return {
    unreadCount: data?.count ?? 0,
  };
}
