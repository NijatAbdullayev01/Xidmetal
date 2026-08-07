'use client';

import { useEffect } from 'react';

/** Minimal SW qeydiyyatı — over-engineer etmə; background GPS brauzer limitlərinə tabedir */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW qeydiyyatı uğursuz olsa belə app işləyir
    });
  }, []);

  return null;
}
