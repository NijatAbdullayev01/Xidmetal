'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useTabAttention } from '@/hooks/use-tab-attention';
import {
  type AdminNavAttentionCounts,
  type AdminTabQueueId,
  adminQueueTabPrefix,
  bumpedAdminQueueId,
  formatAttentionLiveMessage,
  shouldPlayAttentionSound,
} from '@/lib/nav-attention';
import { playAdminAttentionSound, unlockNotificationAudio } from '@/lib/notification-sound';

const STATS_POLL_MS = 10_000;
const ADMIN_TAB_FALLBACK = 'İdarə etmə paneli | Xidmətal';

export function useAdminNavAttention(): {
  counts: AdminNavAttentionCounts | null;
  liveMessage: string;
} {
  const token = useAuthToken();
  const primedRef = useRef(false);
  const lastRef = useRef<AdminNavAttentionCounts | null>(null);
  const [bumpedId, setBumpedId] = useState<AdminTabQueueId | null>(null);

  const { data } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.admin.stats(token!),
    enabled: !!token,
    refetchInterval: STATS_POLL_MS,
    refetchOnWindowFocus: true,
  });

  const providersUnverified = data?.providersUnverified;
  const servicesPendingReview = data?.servicesPendingReview;
  const reviewsPending = data?.reviewsPending;
  const reportsPending = data?.reportsPending;

  const counts = useMemo<AdminNavAttentionCounts | null>(() => {
    if (
      providersUnverified === undefined ||
      servicesPendingReview === undefined ||
      reviewsPending === undefined ||
      reportsPending === undefined
    ) {
      return null;
    }
    return { providersUnverified, servicesPendingReview, reviewsPending, reportsPending };
  }, [providersUnverified, servicesPendingReview, reviewsPending, reportsPending]);

  useEffect(() => {
    if (!token) {
      primedRef.current = false;
      lastRef.current = null;
      setBumpedId(null);
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

    const bumped = bumpedAdminQueueId(lastRef.current, counts);
    if (bumped) {
      setBumpedId(bumped);
    }
    if (shouldPlayAttentionSound(lastRef.current, counts)) {
      void playAdminAttentionSound();
    }
    lastRef.current = counts;
  }, [counts]);

  const tabAttentionLabel = useMemo(
    () => (counts ? adminQueueTabPrefix(counts, bumpedId) : null),
    [counts, bumpedId],
  );

  useTabAttention({
    enabled: !!token,
    attentionLabel: tabAttentionLabel,
    fallbackTitle: ADMIN_TAB_FALLBACK,
  });

  return {
    counts,
    liveMessage: counts ? formatAttentionLiveMessage(counts) : '',
  };
}
