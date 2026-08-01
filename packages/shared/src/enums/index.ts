export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export enum ServiceStatus {
  DRAFT = 'DRAFT',
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

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum NotificationType {
  BOOKING_CREATED = 'BOOKING_CREATED',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  BOOKING_COMPLETED = 'BOOKING_COMPLETED',
  BOOKING_RESCHEDULE_PROPOSED = 'BOOKING_RESCHEDULE_PROPOSED',
  REVIEW_RECEIVED = 'REVIEW_RECEIVED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  /** Platforma / admin bildirişləri — NotificationsBell üçün */
  ADMIN_ANNOUNCEMENT = 'ADMIN_ANNOUNCEMENT',
}

/** Zəng ikonunda göstərilən (admin/platforma) bildiriş tipləri */
export const ADMIN_NOTIFICATION_TYPES = [
  NotificationType.ADMIN_ANNOUNCEMENT,
] as const;

/** Sifarişlər naviqasiya badge-i üçün bildiriş tipləri */
export const BOOKING_NOTIFICATION_TYPES = [
  NotificationType.BOOKING_CREATED,
  NotificationType.BOOKING_CONFIRMED,
  NotificationType.BOOKING_CANCELLED,
  NotificationType.BOOKING_COMPLETED,
  NotificationType.BOOKING_RESCHEDULE_PROPOSED,
] as const;

export enum AvailabilityOverrideType {
  AVAILABLE = 'AVAILABLE',
  BLOCKED = 'BLOCKED',
}

export enum AvailabilitySlotStatus {
  FREE = 'FREE',
  BUSY = 'BUSY',
}
