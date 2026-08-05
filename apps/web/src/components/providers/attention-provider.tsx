'use client';

import { useAuthStore } from '@/store/auth.store';
import { useLiveAttention } from '@/hooks/use-live-attention';
import { LiveToastHost } from '@/components/notifications/live-toast';

/**
 * Autentifikasiya olunmuş istifadəçi üçün qlobal canlı diqqət:
 * səs, vibrasiya, in-app toast, tab badge, gizli tab OS bildirişi
 * və mesaj/sifariş siyahılarının avtomatik yenilənməsi.
 */
export function AttentionProvider({ children }: { children: React.ReactNode }) {
  const enabled = useAuthStore((state) => Boolean(state.tokens?.accessToken && state.user));
  const { toasts, dismissToast } = useLiveAttention(enabled);

  return (
    <>
      <LiveToastHost toasts={toasts} onDismiss={dismissToast} />
      {children}
    </>
  );
}
