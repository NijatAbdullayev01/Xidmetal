'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { REALTIME_EVENTS, type MessageNewPayload } from '@xidmetal/shared';
import { getSharedSocket, useSocket } from '@/hooks/use-socket';
import { UNREAD_MESSAGES_QUERY_KEY } from '@/hooks/use-message-notifications';

/**
 * WS `message:new` → söhbət siyahısı / aktiv thread / unread invalidate.
 * REST polling fallback saxlanılır (bağlantı yoxdursa).
 */
export function useMessagesRealtime(enabled = true): { connected: boolean } {
  const { connected } = useSocket(enabled);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !connected) return;
    const socket = getSharedSocket();
    if (!socket) return;

    const onMessage = (payload: MessageNewPayload) => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      void queryClient.invalidateQueries({
        queryKey: ['conversation', payload.conversationId],
      });
      void queryClient.invalidateQueries({ queryKey: UNREAD_MESSAGES_QUERY_KEY });
    };

    socket.on(REALTIME_EVENTS.MESSAGE_NEW, onMessage);
    return () => {
      socket.off(REALTIME_EVENTS.MESSAGE_NEW, onMessage);
    };
  }, [enabled, connected, queryClient]);

  return { connected };
}
