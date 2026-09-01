'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import {
  BOOKING_ATTENTION_QUERY_KEY,
  useBookingNotifications,
} from '@/hooks/use-booking-notifications';

/**
 * Sifarişlər səhifəsi açıq olanda sifariş bildirişlərini oxundu edir
 * ki, nav badge təmizlənsin (səhifədə olarkən gələnlər də daxil).
 */
export function useAckBookingNotifications(enabled = true) {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const { attentionCount } = useBookingNotifications(enabled);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled || !token || attentionCount <= 0 || inFlightRef.current) return;

    inFlightRef.current = true;

    void api.notifications
      .markBookingReadAll(token)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: BOOKING_ATTENTION_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      })
      .finally(() => {
        inFlightRef.current = false;
      });
  }, [enabled, token, attentionCount, queryClient]);
}
