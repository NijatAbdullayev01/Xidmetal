'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import {
  SERVICE_ATTENTION_QUERY_KEY,
  useServiceNotifications,
} from '@/hooks/use-service-notifications';

/** Xidmətlərim açıq olanda xidmət yoxlaması bildirişlərini oxundu edir. */
export function useAckServiceNotifications(enabled = true) {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const { attentionCount } = useServiceNotifications(enabled);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled || !token || attentionCount <= 0 || inFlightRef.current) return;

    inFlightRef.current = true;

    void api.notifications
      .markServiceReadAll(token)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: SERVICE_ATTENTION_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: ['users', 'dashboard-stats'] });
        void queryClient.invalidateQueries({ queryKey: ['services', 'mine'] });
      })
      .finally(() => {
        inFlightRef.current = false;
      });
  }, [enabled, token, attentionCount, queryClient]);
}
