export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  /** Provider yola çıxdı (canlı izləmə Phase 3-də bağlanır) */
  EN_ROUTE = 'EN_ROUTE',
  /** Provider ünvana çatdı */
  ARRIVED = 'ARRIVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

/** Sifariş tipi — INSTANT = avto-dispatch; SCHEDULED = slot + əl ilə təsdiq */
export enum BookingType {
  SCHEDULED = 'SCHEDULED',
  INSTANT = 'INSTANT',
}

/** Xidmət verən qeydiyyat növü — fərdi şəxs və ya şirkət */
export enum ProviderAccountType {
  INDIVIDUAL = 'INDIVIDUAL',
  COMPANY = 'COMPANY',
}

export const PROVIDER_ACCOUNT_TYPE_LABELS: Record<ProviderAccountType, string> = {
  [ProviderAccountType.INDIVIDUAL]: 'Fərdi',
  [ProviderAccountType.COMPANY]: 'Şirkət',
};

/**
 * Provider domain əlçatanlığı (dispatch / yaxınlıq).
 * `User.lastSeenAt` presence heartbeat-indən ayrıdır — WS/heartbeat ilə sinxronlaşdırılır.
 */
export enum ProviderAvailability {
  OFFLINE = 'OFFLINE',
  ONLINE = 'ONLINE',
  BUSY = 'BUSY',
}

/** On-demand dispatch təklif statusu (Faza 4) */
export enum DispatchOfferStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  /** Xidmət alan qiyməti bəyənməyib bu xidmət verəni buraxdı */
  SKIPPED = 'SKIPPED',
}

/** Ödəniş statusu (Faza 5 — feature flag; default OFF) */
export enum PaymentStatus {
  REQUIRES_PAYMENT = 'REQUIRES_PAYMENT',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

/** Push cihaz platforması (Faza 5) */
export enum DevicePlatform {
  WEB = 'WEB',
  ANDROID = 'ANDROID',
  IOS = 'IOS',
}

export enum ServiceStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  NEEDS_REVISION = 'NEEDS_REVISION',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

export enum PriceUnit {
  FIXED = 'FIXED',
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  PER_SQM = 'PER_SQM',
}

export enum ServiceVenue {
  AT_LOCATION = 'AT_LOCATION',
  AT_SALON = 'AT_SALON',
}

/** Yükdaşıma: şəhərdaxili / şəhərlərarası */
export enum CargoRouteScope {
  INTRA_CITY = 'INTRA_CITY',
  INTERCITY = 'INTERCITY',
  BOTH = 'BOTH',
}

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum NotificationType {
  BOOKING_CREATED = 'BOOKING_CREATED',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  BOOKING_REJECTED = 'BOOKING_REJECTED',
  BOOKING_COMPLETED = 'BOOKING_COMPLETED',
  BOOKING_IN_PROGRESS = 'BOOKING_IN_PROGRESS',
  BOOKING_EN_ROUTE = 'BOOKING_EN_ROUTE',
  BOOKING_ARRIVED = 'BOOKING_ARRIVED',
  BOOKING_RESCHEDULE_PROPOSED = 'BOOKING_RESCHEDULE_PROPOSED',
  /** Xidmət alan providerin tarix təklifini rədd etdi — sifariş PENDING qalır */
  BOOKING_RESCHEDULE_REJECTED = 'BOOKING_RESCHEDULE_REJECTED',
  REVIEW_RECEIVED = 'REVIEW_RECEIVED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  /**
   * Platforma / admin elanı — yalnız zəng + Bildirişlər səhifəsi.
   * Sifariş/mesaj/rəy/xidmət yoxlaması bildirişləri bu inbox-a daxil deyil.
   */
  ADMIN_ANNOUNCEMENT = 'ADMIN_ANNOUNCEMENT',
  /** Admin xidməti təsdiqlədi — Xidmətlərim badge (inbox-a düşmür) */
  SERVICE_APPROVED = 'SERVICE_APPROVED',
  /** Admin xidməti düzəlişə göndərdi — Xidmətlərim (inbox-a düşmür) */
  SERVICE_NEEDS_REVISION = 'SERVICE_NEEDS_REVISION',
}

/**
 * Zəng ikonu və dashboard notifications inbox allowlist-i.
 * Sifariş → BOOKING_*; mesaj → MESSAGE_*; rəy → REVIEW_*;
 * xidmət yoxlaması → SERVICE_* (ayrı badge/kanal).
 */
export const ADMIN_NOTIFICATION_TYPES = [
  NotificationType.ADMIN_ANNOUNCEMENT,
] as const;

/** Sifarişlər naviqasiya badge-i üçün bildiriş tipləri */
export const BOOKING_NOTIFICATION_TYPES = [
  NotificationType.BOOKING_CREATED,
  NotificationType.BOOKING_CONFIRMED,
  NotificationType.BOOKING_CANCELLED,
  NotificationType.BOOKING_REJECTED,
  NotificationType.BOOKING_COMPLETED,
  NotificationType.BOOKING_IN_PROGRESS,
  NotificationType.BOOKING_EN_ROUTE,
  NotificationType.BOOKING_ARRIVED,
  NotificationType.BOOKING_RESCHEDULE_PROPOSED,
  NotificationType.BOOKING_RESCHEDULE_REJECTED,
] as const;

export enum ReportTargetType {
  USER = 'USER',
  SERVICE = 'SERVICE',
  BOOKING = 'BOOKING',
  MESSAGE = 'MESSAGE',
  OTHER = 'OTHER',
}

export enum ReportReason {
  SPAM = 'SPAM',
  FRAUD = 'FRAUD',
  ABUSE = 'ABUSE',
  INAPPROPRIATE = 'INAPPROPRIATE',
  NO_SHOW = 'NO_SHOW',
  OTHER = 'OTHER',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export enum KycDocumentType {
  ID_FRONT = 'ID_FRONT',
  ID_BACK = 'ID_BACK',
  SELFIE = 'SELFIE',
}

export enum KycDocumentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const KYC_DOCUMENT_TYPE_LABELS: Record<KycDocumentType, string> = {
  [KycDocumentType.ID_FRONT]: 'Şəxsiyyət vəsiqəsi (ön)',
  [KycDocumentType.ID_BACK]: 'Şəxsiyyət vəsiqəsi (arxa)',
  [KycDocumentType.SELFIE]: 'Selfie',
};

export const KYC_DOCUMENT_STATUS_LABELS: Record<KycDocumentStatus, string> = {
  [KycDocumentStatus.PENDING]: 'Gözləyir',
  [KycDocumentStatus.APPROVED]: 'Təsdiqlənib',
  [KycDocumentStatus.REJECTED]: 'Rədd edilib',
};

/** Provider reytinq / rəy badge-i */
export const REVIEW_NOTIFICATION_TYPES = [NotificationType.REVIEW_RECEIVED] as const;

/** Mesaj zəng / deep-link (söhbət oxunanda bağlanır) */
export const MESSAGE_NOTIFICATION_TYPES = [NotificationType.MESSAGE_RECEIVED] as const;

/** Xidmət verən — Xidmətlərim badge (təsdiq / düzəliş). Inbox-a düşmür. */
export const SERVICE_NOTIFICATION_TYPES = [
  NotificationType.SERVICE_APPROVED,
  NotificationType.SERVICE_NEEDS_REVISION,
] as const;

const SERVICE_NOTIFICATION_TYPE_SET = new Set<string>(SERVICE_NOTIFICATION_TYPES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Köhnə ADMIN_ANNOUNCEMENT sətirləri `data.serviceApproved` / `serviceNeedsRevision` daşıyır. */
export function isServiceReviewNotification(
  type: string,
  data?: Record<string, unknown> | null,
): boolean {
  if (SERVICE_NOTIFICATION_TYPE_SET.has(type)) return true;
  if (type !== NotificationType.ADMIN_ANNOUNCEMENT || !isRecord(data)) return false;
  return data.serviceApproved === true || data.serviceNeedsRevision === true;
}

export enum AvailabilityOverrideType {
  AVAILABLE = 'AVAILABLE',
  BLOCKED = 'BLOCKED',
}

export enum AvailabilitySlotStatus {
  FREE = 'FREE',
  BUSY = 'BUSY',
}

/** Sayt analitika hadisə tipi (web beacon) */
export enum AnalyticsEventType {
  PAGE_VIEW = 'PAGE_VIEW',
  CLICK = 'CLICK',
  HEARTBEAT = 'HEARTBEAT',
  SESSION_END = 'SESSION_END',
}
