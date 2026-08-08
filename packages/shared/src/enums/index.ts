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
  /** Müştəri providerin tarix təklifini rədd etdi — sifariş PENDING qalır */
  BOOKING_RESCHEDULE_REJECTED = 'BOOKING_RESCHEDULE_REJECTED',
  REVIEW_RECEIVED = 'REVIEW_RECEIVED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  /**
   * Platforma / admin elanı — yalnız zəng + Bildirişlər səhifəsi.
   * Sifariş/mesaj/rəy bildirişləri bu inbox-a daxil deyil.
   */
  ADMIN_ANNOUNCEMENT = 'ADMIN_ANNOUNCEMENT',
}

/**
 * Zəng ikonu və dashboard notifications inbox allowlist-i.
 * Sifariş → BOOKING_*; mesaj → MESSAGE_*; rəy → REVIEW_* (ayrı badge/kanal).
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

/** Provider reytinq / rəy badge-i */
export const REVIEW_NOTIFICATION_TYPES = [NotificationType.REVIEW_RECEIVED] as const;

/** Mesaj zəng / deep-link (söhbət oxunanda bağlanır) */
export const MESSAGE_NOTIFICATION_TYPES = [NotificationType.MESSAGE_RECEIVED] as const;

export enum AvailabilityOverrideType {
  AVAILABLE = 'AVAILABLE',
  BLOCKED = 'BLOCKED',
}

export enum AvailabilitySlotStatus {
  FREE = 'FREE',
  BUSY = 'BUSY',
}
