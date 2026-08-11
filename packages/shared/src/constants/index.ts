/** Xidmətal brend rəngi */
export const BRAND = {
  primary: '#FFCC00',
  primaryDark: '#E6B800',
  primaryLight: '#FFD633',
  primaryForeground: '#1A1A1A',
} as const;

export const APP = {
  name: 'Xidmətal',
  description: 'Xidmət verənlərlə xidmət alanları bir araya gətirən platforma',
  defaultLocale: 'az',
  supportedLocales: ['az', 'en', 'ru'] as const,
} as const;

export const API = {
  prefix: '/api/v1',
  defaultPageSize: 20,
  maxPageSize: 100,
} as const;

/** E-poçt təsdiq kodu — 8 rəqəm (6 rəqəm brute-force üçün zəifdir) */
export const VERIFICATION_CODE_DIGITS = 8 as const;

/** Brauzer klientləri — login audience (yanlış app-də cookie sızmasının qarşısı) */
export const CLIENT_APP = {
  MARKETPLACE: 'marketplace',
  ADMIN: 'admin',
} as const;

export type ClientApp = (typeof CLIENT_APP)[keyof typeof CLIENT_APP];

export const CLIENT_APP_HEADER = 'x-xidmetal-client';

export const PAGINATION = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
} as const;

/** On-demand dispatch (Faza 4) — env ilə override edilə bilər */
export const DISPATCH = {
  /**
   * Ümumi axtarış pəncərəsi (saniyə) — booking yaradılışından etibarən.
   * Tək təklif timeout yoxdur; təkliflər bu pəncərə bitənə qədər qalır.
   * Pəncərə bitəndə hələ qəbul yoxdursa auto-cancel.
   */
  SEARCH_WINDOW_SEC: 600,
  /** Yeni ONLINE xidmət verənlər üçün rediscovery intervalı (saniyə) */
  REDISCOVERY_INTERVAL_SEC: 30,
  /**
   * Xidmət verən təcili təklifi imtina etdikdən sonra yenidən təklif üçün gözləmə (saniyə).
   * Axtarış pəncərəsi açıq qaldıqca və sifariş qəbul olunmayana qədər təkrarlanır.
   */
  DECLINE_REOFFER_COOLDOWN_SEC: 120,
  /** INSTANT üçün scheduledAt ofseti (dəqiqə) — slot lock yox, display window */
  INSTANT_SCHEDULED_OFFSET_MIN: 15,
  /** BullMQ queue adı */
  QUEUE_NAME: 'dispatch-offers',
  /** Redis job prefix */
  QUEUE_PREFIX: 'xidmetal:dispatch',
  /** Bir booking-ə eyni anda max aktiv PENDING offer (xidmət növü fan-out) */
  MAX_ACTIVE_OFFERS: 500,
  /** Namizəd limiti (eyni xidmət növü + şəhər) */
  MAX_CANDIDATES: 500,
} as const;

/** Ödəniş (Faza 5) — default OFF; live charge yoxdur */
export const PAYMENTS = {
  /** Default valyuta */
  DEFAULT_CURRENCY: 'AZN',
  /** Komissiya faizi (scaffolding; məhsul qərarı: hazırda 0) */
  DEFAULT_COMMISSION_RATE: 0,
  /** Idempotency açar max uzunluq */
  IDEMPOTENCY_KEY_MAX_LEN: 128,
} as const;

/** Push / idempotency (Faza 5) */
export const NOTIFICATION_CHANNELS = {
  /** IdempotencyRecord default TTL (saat) */
  IDEMPOTENCY_TTL_HOURS: 24,
} as const;
