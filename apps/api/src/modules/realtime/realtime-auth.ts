import { UserRole } from '@xidmetal/shared';

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
  booking: { customerId: string; providerId: string },
): boolean {
  if (user.role === UserRole.ADMIN) return true;
  return user.id === booking.customerId || user.id === booking.providerId;
}

export function canPushLocation(
  user: Pick<WsAuthenticatedUser, 'id' | 'role'>,
  booking: { providerId: string },
): boolean {
  return user.id === booking.providerId;
}
