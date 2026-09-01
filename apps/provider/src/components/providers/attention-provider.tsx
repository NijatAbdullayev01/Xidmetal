'use client';

import { useAuthStore } from '@/store/auth.store';
import { useAuthHydrated } from '@/hooks/use-auth-hydrated';
import { useLiveAttention } from '@/hooks/use-live-attention';
import { LiveToastHost } from '@/components/notifications/live-toast';
import { NotificationPermissionPrompt } from '@/components/notifications/notification-permission-prompt';

/**
 * Autentifikasiya olunmuş istifadəçi üçün qlobal canlı diqqət:
 * səs, vibrasiya, in-app toast, tab badge, gizli tab OS bildirişi
 * və mesaj/sifariş siyahılarının avtomatik yenilənməsi.
 */
export function AttentionProvider({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthHydrated();
  const enabled = useAuthStore((state) => Boolean(state.session && state.user));
  const { toasts, dismissToast } = useLiveAttention(enabled);

  return (
    <>
      <LiveToastHost toasts={toasts} onDismiss={dismissToast} />
      {hydrated && enabled ? <NotificationPermissionPrompt /> : null}
      {children}
    </>
  );
}
