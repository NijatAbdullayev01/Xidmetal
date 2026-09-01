'use client';

import { useEffect } from 'react';
import {
  applyTabAttentionTitle,
  stripTabAttentionPrefix,
  TAB_ATTENTION_BLINK_MS,
} from '@xidmetal/shared';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Brauzer tab başlığında oxunmamış bildirişin mövzusunu göstərir.
 * Tab gizli olanda mövzu ilə orijinal başlıq arasında yanıb-sönür.
 * Səs, toast və OS bildirişi `useLiveAttention`-dadır.
 */
export function useTabAttention(options: {
  enabled: boolean;
  attentionLabel: string | null;
  fallbackTitle: string;
}) {
  const { enabled, attentionLabel, fallbackTitle } = options;

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    let base = stripTabAttentionPrefix(document.title) || fallbackTitle;
    let applying = false;
    let blinkOn = true;
    let intervalId: number | null = null;

    const setTitle = (value: string) => {
      if (document.title === value) return;
      applying = true;
      document.title = value;
      queueMicrotask(() => {
        applying = false;
      });
    };

    const attentionTitle = () => {
      if (!enabled) return base;
      return applyTabAttentionTitle(base, attentionLabel);
    };

    const shouldBlink = () =>
      enabled &&
      attentionLabel !== null &&
      document.visibilityState === 'hidden' &&
      !prefersReducedMotion();

    const apply = () => {
      const next = attentionTitle();
      if (shouldBlink()) {
        setTitle(blinkOn ? next : base);
        return;
      }
      blinkOn = true;
      setTitle(enabled ? next : stripTabAttentionPrefix(document.title) || fallbackTitle);
    };

    const stopBlink = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const startBlink = () => {
      stopBlink();
      if (!shouldBlink()) return;
      intervalId = window.setInterval(() => {
        blinkOn = !blinkOn;
        apply();
      }, TAB_ATTENTION_BLINK_MS);
    };

    apply();
    startBlink();

    const titleEl = document.querySelector('title');
    const observer =
      titleEl === null
        ? null
        : new MutationObserver(() => {
            if (applying) return;
            base = stripTabAttentionPrefix(document.title) || fallbackTitle;
            apply();
          });
    observer?.observe(titleEl as Node, { childList: true, characterData: true, subtree: true });

    const onVisibility = () => {
      blinkOn = true;
      apply();
      startBlink();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      stopBlink();
      const restored = stripTabAttentionPrefix(document.title) || fallbackTitle;
      if (document.title !== restored) {
        document.title = restored;
      }
    };
  }, [enabled, attentionLabel, fallbackTitle]);
}
