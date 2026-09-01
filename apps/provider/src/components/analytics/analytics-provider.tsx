'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { analytics } from '@/lib/analytics';
import { useAuthStore } from '@/store/auth.store';

/**
 * Marketplace səhifə baxışları, sessiya müddəti və klik izləməsi.
 * Admin paneli bu komponenti istifadə etmir.
 * Children bürümür — useSearchParams/Suspense bütün app-i blank/error etməsin.
 */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const userId = useAuthStore((s) => s.user?.id ?? null);

  useEffect(() => {
    analytics.start(userId);
    return () => {
      analytics.stop();
    };
    // Mount once; userId sync below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    analytics.setUserId(userId);
  }, [userId]);

  useEffect(() => {
    analytics.trackPageView(pathname);
  }, [pathname]);

  return null;
}
