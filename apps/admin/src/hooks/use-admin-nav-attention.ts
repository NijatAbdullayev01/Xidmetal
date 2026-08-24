'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import {
  type AdminNavAttentionCounts,
  formatAttentionLiveMessage,
  shouldPlayAttentionSound,
} from '@/lib/nav-attention';
import { playAdminAttentionSound, unlockNotificationAudio } from '@/lib/notification-sound';

const STATS_POLL_MS = 10_000;

export function useAdminNavAttention(): {
  counts: AdminNavAttentionCounts | null;
  liveMessage: string;
} {
  const token = useAuthToken();
  const primedRef = useRef(false);
  const lastRef = useRef<AdminNavAttentionCounts | null>(null);

  const { data } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.admin.stats(token!),
    enabled: !!token,
    refetchInterval: STATS_POLL_MS,
    refetchOnWindowFocus: true,
  });

  const providersUnverified = data?.providersUnverified;
  const servicesPendingReview = data?.servicesPendingReview;

  const counts = useMemo<AdminNavAttentionCounts | null>(() => {
    if (providersUnverified === undefined || servicesPendingReview === undefined) {
      return null;
    }
    return { providersUnverified, servicesPendingReview };
  }, [providersUnverified, servicesPendingReview]);

  useEffect(() => {
    if (!token) {
      primedRef.current = false;
      lastRef.current = null;
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const unlock = () => {
      void unlockNotificationAudio();
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [token]);

  useEffect(() => {
    if (!counts) return;

    if (!primedRef.current) {
      lastRef.current = counts;
      primedRef.current = true;
      return;
    }

    if (shouldPlayAttentionSound(lastRef.current, counts)) {
      void playAdminAttentionSound();
    }
    lastRef.current = counts;
  }, [counts]);

  return {
    counts,
    liveMessage: counts ? formatAttentionLiveMessage(counts) : '',
  };
}
