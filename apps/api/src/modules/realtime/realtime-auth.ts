import { UserRole } from '@xidmetal/shared';
import {
  isAssignedProvider,
  isBookingParticipant,
} from '../bookings/booking-access';

/** Socket.IO handshake sonrası client.data.user */
export interface WsAuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole | string;
  isActive: boolean;
  isVerified: boolean;
  aud?: string;
}

export function canJoinBookingRoom(
  user: Pick<WsAuthenticatedUser, 'id' | 'role'>,
  booking: {
    customerId: string;
    providerId: string;
    type?: string;
    acceptedAt?: Date | null;
  },
): boolean {
  return isBookingParticipant(user.id, String(user.role), booking);
}

export function canPushLocation(
  user: Pick<WsAuthenticatedUser, 'id' | 'role'>,
  booking: { providerId: string; type?: string; acceptedAt?: Date | null },
): boolean {
  return isAssignedProvider(user.id, {
    customerId: '',
    providerId: booking.providerId,
    type: booking.type,
    acceptedAt: booking.acceptedAt,
  });
}
