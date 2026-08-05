'use client';

import { useEffect } from 'react';
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
 * Brauzer tab başlığında oxunmamış mesaj / sifariş diqqətini göstərir.
 * Səs, toast və OS bildirişi `useLiveAttention`-dadır.
 */
export function useTabAttention(options: {
  enabled: boolean;
  unreadMessages: number;
  bookingAttention: number;
}) {
  const { enabled, unreadMessages, bookingAttention } = options;

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
}
