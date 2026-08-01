'use client';

import { useAuthStore } from '@/store/auth.store';
import { useMessageNotifications } from '@/hooks/use-message-notifications';
import { useBookingNotifications } from '@/hooks/use-booking-notifications';
import { useTabAttention } from '@/hooks/use-tab-attention';

/**
 * Autentifikasiya olunmuş istifadəçi üçün qlobal diqqət siqnalları:
 * səs (kabinetdən kənarda da), tab badge və gizli tab OS bildirişi.
 * Query cache sidebar/header ilə paylaşılır — ikiqat şəbəkə yoxdur.
 */
export function AttentionProvider({ children }: { children: React.ReactNode }) {
  const enabled = useAuthStore((state) => Boolean(state.tokens?.accessToken && state.user));

  const { unreadCount, latestUnreadMessageId } = useMessageNotifications(enabled, {
    playSound: true,
  });
  const { attentionCount, latestUnreadId: latestBookingId } = useBookingNotifications(
    enabled,
    { playSound: true },
  );

  useTabAttention({
    enabled,
    unreadMessages: unreadCount,
    bookingAttention: attentionCount,
    latestMessageId: latestUnreadMessageId,
    latestBookingId,
  });

  return <>{children}</>;
}
