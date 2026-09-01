'use client';

import { useEffect } from 'react';

/** Minimal SW qeydiyyatı — over-engineer etmə; background GPS brauzer limitlərinə tabedir */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Dev-də də qeydiyyatdan keçirik — `beforeinstallprompt` (PWA quraşdırma
    // təklifi) yalnız aktiv service worker + manifest ilə atəşlənir.
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW qeydiyyatı uğursuz olsa belə app işləyir
    });
  }, []);

  return null;
}
