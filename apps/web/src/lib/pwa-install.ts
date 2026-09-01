/**
 * PWA quraşdırma təklifi — `beforeinstallprompt` tutma + platforma ayrımı.
 *
 * `beforeinstallprompt` yalnız Chromium əsaslı (Android) brauzerlərdə atəşlənir.
 * iOS Safari bunu göndərmir — ona görə «Paylaş → Ana ekrana əlavə et» bələdçisi göstərilir.
 * `installed` (standalone) halı heç vaxt təklif göstərmir.
 */

/** Chromium-un quraşdırma dialoqunu açan deferred event */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type InstallPromptMode = 'installable' | 'ios';

const INSTALL_PROMPT_STORAGE_KEY = 'xidmetal.pwa-install-dismissed-at';

/** «Sonra» deyildikdən sonra yenidən göstərmə fasiləsi (3 gün) */
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

/** Mobil görünüş — yalnız telefonda göstərmək üçün */
export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 767px)').matches;
}

/** Artıq quraşdırılıb (standalone/ana ekran rejimi) */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
  );
}

/** iOS cihaz — `beforeinstallprompt` yoxdur, bələdçi lazımdır */
export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function readInstallDismissedAt(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const value = Number.parseInt(window.localStorage.getItem(INSTALL_PROMPT_STORAGE_KEY) ?? '', 10);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export function writeInstallDismissedAt(value = Date.now()): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(INSTALL_PROMPT_STORAGE_KEY, String(value));
  } catch {
    // localStorage bloklanıbsa — sadəcə göstərməyə davam et
  }
}

/** Son dəfə «Sonra» deyildiyindən SNOOZE_MS keçməyibsə göstərmə */
export function isInstallPromptSnoozed(): boolean {
  return Date.now() - readInstallDismissedAt() < SNOOZE_MS;
}
