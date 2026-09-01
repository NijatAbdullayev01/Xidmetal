import {
  NotificationType,
  UserRole,
  BOOKING_NOTIFICATION_TYPES,
  REVIEW_NOTIFICATION_TYPES,
  isServiceReviewNotification,
  sanitizeInternalPath,
} from '@xidmetal/shared';
import type { NotificationSummary } from '@xidmetal/shared';

export { sanitizeInternalPath };

const BOOKING_TYPES = new Set<string>(BOOKING_NOTIFICATION_TYPES);
const REVIEW_TYPES = new Set<string>(REVIEW_NOTIFICATION_TYPES);

function roleDashboardBase(role: UserRole): '/dashboard/customer' | '/dashboard/provider' | null {
  if (role === UserRole.CUSTOMER) return '/dashboard/customer';
  if (role === UserRole.PROVIDER) return '/dashboard/provider';
  return null;
}

/**
 * Bildiriş klikində hansı səhifəyə getməli olduğunu müəyyən edir.
 */
export function resolveNotificationHref(
  notification: Pick<NotificationSummary, 'type' | 'data'>,
  role: UserRole,
): string | null {
  const data = notification.data ?? null;
  const explicit = sanitizeInternalPath(data?.href ?? data?.path);
  if (explicit) return explicit;

  const base = roleDashboardBase(role);
  if (!base) return null;

  if (BOOKING_TYPES.has(notification.type)) {
    const bookingId = typeof data?.bookingId === 'string' ? data.bookingId : null;
    if (bookingId) {
      return `${base}/bookings/${encodeURIComponent(bookingId)}`;
    }
    return `${base}/bookings`;
  }

  if (REVIEW_TYPES.has(notification.type) || notification.type === NotificationType.REVIEW_RECEIVED) {
    return role === UserRole.PROVIDER ? '/dashboard/provider/ratings' : null;
  }

  if (notification.type === NotificationType.MESSAGE_RECEIVED) {
    const conversationId =
      typeof data?.conversationId === 'string' ? data.conversationId : null;
    if (conversationId) {
      return `${base}/messages?conversationId=${encodeURIComponent(conversationId)}`;
    }
    return `${base}/messages`;
  }

  if (isServiceReviewNotification(notification.type, data)) {
    const serviceId = typeof data?.serviceId === 'string' ? data.serviceId : null;
    const needsRevision =
      notification.type === NotificationType.SERVICE_NEEDS_REVISION ||
      data?.serviceNeedsRevision === true;
    if (needsRevision && serviceId) {
      return `/dashboard/provider/services/${encodeURIComponent(serviceId)}/edit`;
    }
    return '/dashboard/provider/services';
  }

  if (notification.type === NotificationType.ADMIN_ANNOUNCEMENT) {
    return base;
  }

  return null;
}
