'use client';

import { useEffect, useRef } from 'react';
import { APP } from '@xidmetal/shared';

/** Bizim əlavə etdiyimiz diqqət prefiksi: "(Yeni mesaj) …", "(2 yeni mesaj, 1 yeni sifariş) …" */
const TITLE_ATTENTION_RE = /^\([^)]*(?:mesaj|sifariş)[^)]*\)\s+/i;
const LEGACY_COUNT_RE = /^\(\d+\)\s+/;

function stripTitleAttention(title: string): string {
  const cleaned = title.replace(TITLE_ATTENTION_RE, '').replace(LEGACY_COUNT_RE, '').trim();
  return cleaned || APP.name;
}

function formatAttentionLabel(unreadMessages: number, bookingAttention: number): string | null {
  const parts: string[] = [];

  if (unreadMessages > 0) {
    parts.push(unreadMessages === 1 ? 'Yeni mesaj' : `${unreadMessages} yeni mesaj`);
  }

  if (bookingAttention > 0) {
    parts.push(bookingAttention === 1 ? 'Yeni sifariş' : `${bookingAttention} yeni sifariş`);
  }

  if (parts.length === 0) return null;
  return parts.join(', ');
}

function withTitleAttention(
  baseTitle: string,
  unreadMessages: number,
  bookingAttention: number,
): string {
  const base = stripTitleAttention(baseTitle);
  const label = formatAttentionLabel(unreadMessages, bookingAttention);
  return label ? `(${label}) ${base}` : base;
}

/**
 * Brauzer tab başlığında bildirişin növünü göstərir və tab gizlidirsə
 * OS bildirişi verir (icazə verilərsə).
 */
export function useTabAttention(options: {
  enabled: boolean;
  unreadMessages: number;
  bookingAttention: number;
  latestMessageId: string | null;
  latestBookingId: string | null;
}) {
  const {
    enabled,
    unreadMessages,
    bookingAttention,
    latestMessageId,
    latestBookingId,
  } = options;

  const primedRef = useRef(false);
  const lastMessageIdRef = useRef<string | null>(null);
  const lastBookingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const apply = () => {
      const next = withTitleAttention(document.title, unreadMessages, bookingAttention);
      if (document.title !== next) {
        document.title = next;
      }
    };

    apply();

    const titleEl = document.querySelector('title');
    if (!titleEl) return;

    const observer = new MutationObserver(() => {
      apply();
    });

    observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [enabled, unreadMessages, bookingAttention]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('Notification' in window)) return;

    const requestIfNeeded = () => {
      if (Notification.permission === 'default') {
        void Notification.requestPermission();
      }
    };

    window.addEventListener('pointerdown', requestIfNeeded, { once: true });
    window.addEventListener('keydown', requestIfNeeded, { once: true });

    return () => {
      window.removeEventListener('pointerdown', requestIfNeeded);
      window.removeEventListener('keydown', requestIfNeeded);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    if (!primedRef.current) {
      lastMessageIdRef.current = latestMessageId;
      lastBookingIdRef.current = latestBookingId;
      primedRef.current = true;
      return;
    }

    if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
      lastMessageIdRef.current = latestMessageId;
      lastBookingIdRef.current = latestBookingId;
      return;
    }

    if (!('Notification' in window) || Notification.permission !== 'granted') {
      lastMessageIdRef.current = latestMessageId;
      lastBookingIdRef.current = latestBookingId;
      return;
    }

    if (latestMessageId && latestMessageId !== lastMessageIdRef.current) {
      try {
        new Notification('Yeni mesaj', {
          body: 'Sizə yeni mesaj gəldi. Kabinetinizdən oxuya bilərsiniz.',
          tag: `message-${latestMessageId}`,
        });
      } catch {
        // ignore
      }
    }

    if (latestBookingId && latestBookingId !== lastBookingIdRef.current) {
      try {
        new Notification('Yeni sifariş', {
          body: 'Yeni sifariş bildirişiniz var. Kabinetinizdən baxa bilərsiniz.',
          tag: `booking-${latestBookingId}`,
        });
      } catch {
        // ignore
      }
    }

    lastMessageIdRef.current = latestMessageId;
    lastBookingIdRef.current = latestBookingId;
  }, [enabled, latestMessageId, latestBookingId]);
}
