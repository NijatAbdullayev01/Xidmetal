'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import {
  REVIEW_ATTENTION_QUERY_KEY,
  useReviewNotifications,
} from '@/hooks/use-review-notifications';

/** Reytinq səhifəsi açıq olanda rəy bildirişlərini oxundu edir. */
export function useAckReviewNotifications(enabled = true) {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const { attentionCount } = useReviewNotifications(enabled);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled || !token || attentionCount <= 0 || inFlightRef.current) return;

    inFlightRef.current = true;

    void api.notifications
      .markReviewReadAll(token)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: REVIEW_ATTENTION_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: ['reviews', 'received'] });
      })
      .finally(() => {
        inFlightRef.current = false;
      });
  }, [enabled, token, attentionCount, queryClient]);
}
