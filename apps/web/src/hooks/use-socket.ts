'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { CLIENT_APP } from '@xidmetal/shared';
import { useAuthToken } from '@/hooks/use-auth-token';

/**
 * WS origin — REST eyni origin rewrite ilə gedirsə belə Socket.IO birbaşa API-yə.
 * NEXT_PUBLIC_WS_URL > NEXT_PUBLIC_API_URL > window.location.origin > localhost:4100
 * Production (Cloudflare edge): WS URL-i boş saxla — eyni host `/socket.io`.
 */
export function resolveWsUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (apiUrl) return apiUrl.replace(/\/$/, '');
  if (typeof globalThis.window !== 'undefined' && globalThis.window.location?.origin) {
    return globalThis.window.location.origin;
  }
  return 'http://localhost:4100';
}

let sharedSocket: Socket | null = null;
let sharedToken: string | null = null;
let connectPromise: Promise<Socket | null> | null = null;
let connectGeneration = 0;

function hardDisconnect(socket: Socket): void {
  socket.io.reconnection(false);
  socket.disconnect();
}

export function disconnectSharedSocket(): void {
  connectGeneration += 1;
  connectPromise = null;
  sharedToken = null;
  if (sharedSocket) {
    hardDisconnect(sharedSocket);
    sharedSocket = null;
  }
}

function waitUntilConnected(socket: Socket, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (socket.connected) {
      resolve();
      return;
    }
    const finish = () => {
      clearTimeout(timer);
      socket.off('connect', finish);
      socket.off('connect_error', finish);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    socket.once('connect', finish);
    socket.once('connect_error', finish);
  });
}

/**
 * Eyni sessiyada tək Socket.IO client. Paralel hook-lar eyni promise-i paylaşır;
 * müvəqqəti disconnect-də yeni client açılmır (auto-reconnect işləyir).
 */
export async function ensureSharedSocket(sessionToken: string): Promise<Socket | null> {
  if (sharedToken === sessionToken) {
    if (sharedSocket) return sharedSocket;
    if (connectPromise) return connectPromise;
  }

  const generation = ++connectGeneration;
  sharedToken = sessionToken;

  connectPromise = (async () => {
    if (sharedSocket) {
      hardDisconnect(sharedSocket);
      sharedSocket = null;
    }

    const socket = io(resolveWsUrl(), {
      autoConnect: true,
      forceNew: true,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: {
        clientApp: CLIENT_APP.MARKETPLACE,
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1_000,
    });

    await waitUntilConnected(socket, 8_000);

    if (generation !== connectGeneration) {
      hardDisconnect(socket);
      return null;
    }

    sharedSocket = socket;
    return socket;
  })().finally(() => {
    if (generation === connectGeneration) {
      connectPromise = null;
    }
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
    if (!token) {
      disconnectSharedSocket();
      setConnected(false);
      return;
    }
    if (!enabled) {
      setConnected(false);
      return;
    }

    let cancelled = false;
    let socketForCleanup: Socket | null = null;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    void (async () => {
      const s = await ensureSharedSocket(token);
      if (cancelled || !enabledRef.current) return;
      if (!s) {
        setConnected(false);
        return;
      }
      socketForCleanup = s;
      setConnected(Boolean(s.connected));
      s.on('connect', onConnect);
      s.on('disconnect', onDisconnect);
    })();

    return () => {
      cancelled = true;
      socketForCleanup?.off('connect', onConnect);
      socketForCleanup?.off('disconnect', onDisconnect);
    };
  }, [enabled, token]);

  return { connected };
}
