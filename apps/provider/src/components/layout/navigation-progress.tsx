'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Soft navigation zamanı dərhal görünən nazik progress bar.
 * loading.tsx skeleton-u gələnə qədər (və ya keşdən sürətli keçiddə) feedback verir.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const activeRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      let nextUrl: URL;
      try {
        nextUrl = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (nextUrl.origin !== window.location.origin) return;

      const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const next = `${nextUrl.pathname}${nextUrl.search}`;
      if (next === current) return;

      clearTimers();
      activeRef.current = true;
      setVisible(true);
      setProgress(12);
      timersRef.current.push(setTimeout(() => setProgress(55), 120));
      timersRef.current.push(setTimeout(() => setProgress(78), 400));
    };

    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
      clearTimers();
    };
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!activeRef.current) return;

    clearTimers();
    setProgress(100);
    const hideTimer = setTimeout(() => {
      activeRef.current = false;
      setVisible(false);
      setProgress(0);
    }, 180);
    timersRef.current.push(hideTimer);

    return clearTimers;
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 bg-transparent"
      role="progressbar"
      aria-hidden
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
    >
      <div
        className="h-full bg-brand transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
