import { UserRole } from '@xidmetal/shared';

export type LiveAttentionKind = 'message' | 'booking';

/** Görünən tabda daha tez, arxa planda da dayandırılmadan poll */
export const LIVE_POLL_VISIBLE_MS = 4_000;
export const LIVE_POLL_HIDDEN_MS = 12_000;
export const BOOKING_POLL_VISIBLE_MS = 5_000;
export const BOOKING_POLL_HIDDEN_MS = 12_000;

export function livePollIntervalMs(visibleMs: number, hiddenMs: number): number {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return hiddenMs;
  }
  return visibleMs;
}

export function dashboardMessagesPath(role: string | undefined): string {
  if (role === UserRole.PROVIDER) return '/dashboard/provider/messages';
  if (role === UserRole.CUSTOMER) return '/dashboard/customer/messages';
  return '/dashboard';
}

export function dashboardBookingsPath(role: string | undefined): string {
  if (role === UserRole.PROVIDER) return '/dashboard/provider/bookings';
  if (role === UserRole.CUSTOMER) return '/dashboard/customer/bookings';
  return '/dashboard';
}

/** Mobil cihazlarda qısa vibrasiya (dəstəklənirsə). */
export function vibrateAttention(kind: LiveAttentionKind): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    if (kind === 'booking') {
      navigator.vibrate([80, 40, 80, 40, 120]);
    } else {
      navigator.vibrate([60, 30, 60]);
    }
  } catch {
    // ignore
  }
}

export function showOsNotification(options: {
  title: string;
  body: string;
  tag: string;
}): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      tag: options.tag,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Safari / restricted contexts
  }
}

/** Brauzer bildiriş icazəsini istifadəçi jestində soruşur. */
export async function requestNotificationPermission(): Promise<NotificationPermission | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return null;
  }
}
