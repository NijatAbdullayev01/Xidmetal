'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  REALTIME_EVENTS,
  type DispatchOfferPayload,
  type DispatchOfferSummary,
} from '@xidmetal/shared';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getSharedSocket, useSocket } from '@/hooks/use-socket';

const POLL_MS = 8_000;

/**
 * Provider pending dispatch offers — WS `dispatch:offer` + REST polling fallback.
 */
export function useDispatchOffers(enabled = true) {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const { connected } = useSocket(enabled && !!token);
  const [toast, setToast] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['dispatch', 'pending'],
    queryFn: () => api.dispatch.pendingOffers(token!),
    enabled: enabled && !!token,
    refetchInterval: connected ? POLL_MS * 2 : POLL_MS,
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['dispatch', 'pending'] });
    void queryClient.invalidateQueries({ queryKey: ['bookings'] });
  }, [queryClient]);

  useEffect(() => {
    if (!enabled || !token) return;
    const socket = getSharedSocket();
    if (!socket) return;

    const onOffer = (payload: DispatchOfferPayload) => {
      setToast(`Yeni ani sifariş: ${payload.serviceTitle}`);
      invalidate();
    };
    const onExpired = () => {
      invalidate();
    };
    const onResult = () => {
      invalidate();
    };

    socket.on(REALTIME_EVENTS.DISPATCH_OFFER, onOffer);
    socket.on(REALTIME_EVENTS.DISPATCH_OFFER_EXPIRED, onExpired);
    socket.on(REALTIME_EVENTS.DISPATCH_OFFER_RESULT, onResult);

    return () => {
      socket.off(REALTIME_EVENTS.DISPATCH_OFFER, onOffer);
      socket.off(REALTIME_EVENTS.DISPATCH_OFFER_EXPIRED, onExpired);
      socket.off(REALTIME_EVENTS.DISPATCH_OFFER_RESULT, onResult);
    };
  }, [enabled, token, connected, invalidate]);

  const acceptMutation = useMutation({
    mutationFn: (offerId: string) => api.dispatch.acceptOffer(token!, offerId),
    onSuccess: () => {
      setToast('Sifariş qəbul edildi');
      invalidate();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (offerId: string) => api.dispatch.rejectOffer(token!, offerId),
    onSuccess: () => {
      setToast(null);
      invalidate();
    },
  });

  return {
    offers: (query.data ?? []) as DispatchOfferSummary[],
    isLoading: query.isLoading,
    error:
      query.error instanceof ApiError
        ? query.error.message
        : query.error
          ? 'Təkliflər yüklənmədi'
          : null,
    toast,
    clearToast: () => setToast(null),
    accept: acceptMutation.mutate,
    reject: rejectMutation.mutate,
    acceptingId: acceptMutation.isPending
      ? (acceptMutation.variables as string | undefined)
      : undefined,
    rejectingId: rejectMutation.isPending
      ? (rejectMutation.variables as string | undefined)
      : undefined,
    acceptError:
      acceptMutation.error instanceof ApiError
        ? acceptMutation.error.message
        : null,
    wsConnected: connected,
  };
}
