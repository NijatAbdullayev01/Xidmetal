/**
 * Brauzer bildiriş icazəsi — UX və native dialoq.
 *
 * `default` → `Notification.requestPermission()` native pəncərəni açır.
 * `denied` → native dialoq bir daha açılmır; yalnız sayt/OS ayarları.
 * Bütün `requestPermission` çağırışları istifadəçi klik jestində SINXRON başlamalıdır.
 */

export type NotificationPromptMode = 'ask' | 'blocked' | 'unsupported' | 'granted';

export type BrowserFamily =
  | 'chrome'
  | 'edge'
  | 'firefox'
  | 'safari'
  | 'samsung'
  | 'other';

export type PermissionOpenResult = {
  permission: NotificationPermission | null;
  /** İstifadəçi üçün avtomatik açılan səth */
  opened: 'native-prompt' | 'os-settings' | 'none';
};

export function readNotificationPromptMode(): NotificationPromptMode | null {
  if (typeof window === 'undefined') return null;
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'blocked';
  return 'ask';
}

export function detectBrowserFamily(): BrowserFamily {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;

  if (/SamsungBrowser/i.test(ua)) return 'samsung';
  if (/\bEdg\//.test(ua)) return 'edge';
  if (/Firefox\//.test(ua)) return 'firefox';
  // iOS Chrome/Firefox da WebKit — Safari ailəsi kimi göstər
  if (/Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR/i.test(ua)) return 'safari';
  if (/Chrome|Chromium|CriOS/i.test(ua)) return 'chrome';
  return 'other';
}

function isMobileViewport(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** Bloklanmış vəziyyət üçün brauzerə uyğun dəqiq addımlar (AZ). */
export function blockedNotificationSteps(browser = detectBrowserFamily()): string {
  const mobile = isMobileViewport();

  switch (browser) {
    case 'firefox':
      return mobile
        ? 'Ünvan çubuğundakı kilidə basın → İcazələr → Bildirişlər → İcazə ver.'
        : 'Ünvan çubuğundakı kilidə basın → Bağlantı parametrləri → Bildirişlər → İcazə ver.';
    case 'safari':
      return mobile
        ? 'Ayarlar → Safari → Bildirişlər bölməsindən bu sayt üçün icazə verin.'
        : 'Safari menyusu → Ayarlar → Vebsaytlar → Bildirişlər → bu sayt üçün İcazə ver.';
    case 'samsung':
      return 'Ünvan çubuğundakı kilidə basın → İcazələr → Bildirişlər → İcazə ver.';
    case 'edge':
    case 'chrome':
    default:
      return mobile
        ? 'Ünvan çubuğundakı kilidə və ya tuninq ikonuna basın → İcazələr → Bildirişlər → İcazə ver.'
        : 'Ünvan çubuğunun solundakı kilidə (və ya tuninq) basın → Sayt ayarları → Bildirişlər → İcazə ver.';
  }
}

export function notificationPromptCopy(mode: Exclude<NotificationPromptMode, 'granted'>): {
  title: string;
  description: string;
  primaryLabel: string;
} {
  if (mode === 'unsupported') {
    return {
      title: 'Bildirişlər dəstəklənmir',
      description: 'Chrome, Firefox, Edge və ya Safari ilə HTTPS (və ya localhost) üzərindən açın.',
      primaryLabel: 'İcazə ver',
    };
  }

  if (mode === 'blocked') {
    return {
      title: 'Bildirişlər bloklanıb',
      description: `${blockedNotificationSteps()} Sonra bu səhifəyə qayıdın — banner avtomatik bağlanacaq.`,
      primaryLabel: 'İcazə ver',
    };
  }

  return {
    title: 'Bildirişlərə icazə verin',
    description:
      'Mesaj və sifariş xəbərdarlıqları üçün brauzer icazəsi lazımdır. «İcazə ver» brauzerin öz icazə pəncərəsini açacaq.',
    primaryLabel: 'İcazə ver',
  };
}

/**
 * Mümkün olduqda OS bildiriş ayarlarını açır.
 * Sayt səviyyəli panel (`chrome://…`) web səhifədən açıla bilmir.
 */
export function tryOpenOsNotificationSettings(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent;
  const isWindows = /Windows/i.test(ua);
  const isEdge = /\bEdg\//.test(ua);

  try {
    if (isWindows && isEdge) {
      window.open('ms-settings:privacy-notifications', '_blank', 'noopener,noreferrer');
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * «İcazə ver» klik handler-indən çağırın (user gesture).
 * `default` → native Allow/Block pəncərəsi.
 * `denied` → mümkün OS ayarları.
 */
export function openNotificationPermissionUi(): Promise<PermissionOpenResult> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return Promise.resolve({ permission: null, opened: 'none' });
  }

  const current = Notification.permission;

  if (current === 'granted') {
    return Promise.resolve({ permission: 'granted', opened: 'none' });
  }

  if (current === 'default') {
    try {
      return Notification.requestPermission()
        .then((permission) => ({
          permission,
          opened: 'native-prompt' as const,
        }))
        .catch(() => ({ permission: null, opened: 'none' as const }));
    } catch {
      return Promise.resolve({ permission: null, opened: 'none' });
    }
  }

  // denied — native prompt açılmır
  const openedOs = tryOpenOsNotificationSettings();
  return Promise.resolve({
    permission: 'denied',
    opened: openedOs ? 'os-settings' : 'none',
  });
}

/** Geri uyğunluq: köhnə çağırış yerləri */
export function requestNotificationPermission(): Promise<NotificationPermission | null> {
  return openNotificationPermissionUi().then((result) => result.permission);
}
