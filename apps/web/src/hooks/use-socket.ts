'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { CLIENT_APP, CLIENT_APP_HEADER } from '@xidmetal/shared';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useAuthStore } from '@/store/auth.store';

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

async function fetchSocketToken(sessionToken: string): Promise<string | null> {
  try {
    const res = await api.realtime.socketToken(sessionToken);
    return res.token;
  } catch (error) {
    // Admin cookie marketplace-ə qarışanda / aud uyğunsuzluğu — local session təmizlə
    if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
      useAuthStore.getState().logout();
    }
    return null;
  }
}

async function ensureSocket(sessionToken: string): Promise<Socket | null> {
  if (sharedSocket?.connected && sharedToken === sessionToken) {
    return sharedSocket;
  }

  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const jwt = await fetchSocketToken(sessionToken);
    if (!jwt) return null;

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
        token: jwt,
        clientApp: CLIENT_APP.MARKETPLACE,
      },
      extraHeaders: {
        [CLIENT_APP_HEADER]: CLIENT_APP.MARKETPLACE,
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
 * Marketplace Socket.IO — JWT cookie → /realtime/socket-token → auth.token.
 * x-xidmetal-client həmişə göndərilir (app-scoped cookie seçimi).
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
