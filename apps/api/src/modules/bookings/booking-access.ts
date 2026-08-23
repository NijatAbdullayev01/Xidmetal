import { BookingType, UserRole } from '@xidmetal/shared';

/** INSTANT seed `providerId` qəbul olunana qədər təyin olunmuş icraçı sayılmır. */
export type BookingAccessFields = {
  customerId: string;
  providerId: string;
  type?: string;
  acceptedAt?: Date | null;
};

export function isInstantUnassigned(booking: BookingAccessFields): boolean {
  return booking.type === BookingType.INSTANT && booking.acceptedAt == null;
}

export function isAssignedProvider(
  userId: string,
  booking: BookingAccessFields,
): boolean {
  if (booking.providerId !== userId) return false;
  return !isInstantUnassigned(booking);
}

export function isBookingParticipant(
  userId: string,
  role: string,
  booking: BookingAccessFields,
): boolean {
  if (role === UserRole.ADMIN) return true;
  return booking.customerId === userId || isAssignedProvider(userId, booking);
}
