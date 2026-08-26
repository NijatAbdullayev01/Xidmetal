import { UserRole } from '@xidmetal/shared';

export type LiveAttentionKind = 'message' | 'booking' | 'admin';

/** Görünən tabda daha tez, arxa planda da dayandırılmadan poll */
export const LIVE_POLL_VISIBLE_MS = 4_000;
export const LIVE_POLL_HIDDEN_MS = 12_000;
export const BOOKING_POLL_VISIBLE_MS = 5_000;
export const BOOKING_POLL_HIDDEN_MS = 12_000;

/**
 * WS bağlı olanda REST poll yalnız nadir safety-net (invalidate əsas mənbədir).
 * 5k concurrent üçün kritik — əks halda HTTP fırtınası yaranır.
 */
export const WS_CONNECTED_FALLBACK_POLL_MS = 90_000;

/** Dashboard siyahıları (overview / bookings) — WS invalidate + seyrək poll */
export const DASHBOARD_LIST_POLL_MS = 20_000;

/** Admin təsdiqi gözləyən xidmət verən kabineti */
export const PROVIDER_VERIFICATION_POLL_MS = 10_000;

export function livePollIntervalMs(visibleMs: number, hiddenMs: number): number {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return hiddenMs;
  }
  return visibleMs;
}

/** WS bağlı → uzun fallback; əks halda görünən/gizli poll */
export function wsAwarePollIntervalMs(
  connected: boolean,
  visibleMs: number,
  hiddenMs: number,
): number {
  if (connected) return WS_CONNECTED_FALLBACK_POLL_MS;
  return livePollIntervalMs(visibleMs, hiddenMs);
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

export function dashboardNotificationsPath(role: string | undefined): string {
  if (role === UserRole.PROVIDER) return '/dashboard/provider/notifications';
  if (role === UserRole.CUSTOMER) return '/dashboard/customer/notifications';
  return '/dashboard';
}

export function dashboardServicesPath(): string {
  return '/dashboard/provider/services';
}

/** Mobil cihazlarda qısa vibrasiya (dəstəklənirsə). */
export function vibrateAttention(kind: LiveAttentionKind): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    if (kind === 'booking') {
      navigator.vibrate([80, 40, 80, 40, 120]);
    } else if (kind === 'admin') {
      navigator.vibrate([100, 50, 100]);
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

/**
 * Brauzer bildiriş icazəsi — `@/lib/notification-permission`.
 * Bu faylda yalnız diqqət/poll köməkçiləri qalır; icazə API re-export olunur.
 */
export {
  openNotificationPermissionUi,
  requestNotificationPermission,
  tryOpenOsNotificationSettings as tryOpenNotificationPermissionSettings,
} from '@/lib/notification-permission';

/**
 * Auth düyməsi / form submit zamanı SINXRON çağırın (ilk sətir).
 * İcazə yalnız açıq CTA-dan soruşulur — login jestində avtomatik dialoq yoxdur.
 */
export function primeBrowserNotificationPermission(): void {
  // no-op: təsadüfi Block riskini azaldır; banner «İcazə ver» native pəncərəni açır
}
