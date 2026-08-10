'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { CLIENT_APP } from '@xidmetal/shared';
import { useAuthToken } from '@/hooks/use-auth-token';

/**
 * WS origin — REST eyni origin rewrite ilə gedirsə belə Socket.IO birbaşa API-yə.
 * NEXT_PUBLIC_WS_URL > NEXT_PUBLIC_API_URL > localhost:4000
 */
export function resolveWsUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (apiUrl) return apiUrl.replace(/\/$/, '');
  return 'http://localhost:4000';
}

let sharedSocket: Socket | null = null;
let sharedToken: string | null = null;
let connectPromise: Promise<Socket | null> | null = null;

async function ensureSocket(sessionToken: string): Promise<Socket | null> {
  if (sharedSocket?.connected && sharedToken === sessionToken) {
    return sharedSocket;
  }

  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    if (sharedSocket) {
      sharedSocket.removeAllListeners();
      sharedSocket.disconnect();
      sharedSocket = null;
    }

    const socket = io(resolveWsUrl(), {
      autoConnect: true,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: {
        clientApp: CLIENT_APP.MARKETPLACE,
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1_000,
    });

    sharedSocket = socket;
    sharedToken = sessionToken;

    await new Promise<void>((resolve) => {
      if (socket.connected) {
        resolve();
        return;
      }
      const onConnect = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        resolve();
      };
      const timer = setTimeout(() => {
        cleanup();
        resolve();
      }, 8_000);
      function cleanup() {
        clearTimeout(timer);
        socket.off('connect', onConnect);
        socket.off('connect_error', onError);
      }
      socket.on('connect', onConnect);
      socket.on('connect_error', onError);
    });

    return socket.connected ? socket : socket;
  })().finally(() => {
    connectPromise = null;
  });

  return connectPromise;
}

export function getSharedSocket(): Socket | null {
  return sharedSocket;
}

/**
 * Marketplace Socket.IO — yalnız httpOnly cookie sessiyası ilə autentifikasiya olunur.
 * `clientApp` handshake auth-da ötürülür ki, düzgün app-scoped cookie seçilsin.
 * Polling fallback saxlanılır; WS additive qatdır.
 */
export function useSocket(enabled = true): {
  connected: boolean;
} {
  const token = useAuthToken();
  const [connected, setConnected] = useState(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled || !token) {
      setConnected(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      const s = await ensureSocket(token);
      if (cancelled || !enabledRef.current) return;
      setConnected(Boolean(s?.connected));

      if (!s) return;

      const onConnect = () => setConnected(true);
      const onDisconnect = () => setConnected(false);
      s.on('connect', onConnect);
      s.on('disconnect', onDisconnect);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, token]);

  return { connected };
}
