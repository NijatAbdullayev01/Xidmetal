import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../database/prisma.service';

export const PROVIDER_NOT_VERIFIED_MESSAGE =
  'Xidmət göstərmək üçün hesabınız admin tərəfindən təsdiqlənməlidir';

/**
 * Admin təsdiqi olmadan xidmət verən marketplace-də xidmət göstərə bilməz
 * (aktiv xidmət, onlayn əlçatanlıq, sifariş qəbulu).
 */
export async function assertProviderVerified(
  prisma: PrismaService,
  userId: string,
  message: string = PROVIDER_NOT_VERIFIED_MESSAGE,
): Promise<void> {
  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: { isVerified: true },
  });

  if (!profile?.isVerified) {
    throw new ForbiddenException(message);
  }
}

export function isProviderDutyAvailability(
  availability: string,
): boolean {
  return availability === 'ONLINE' || availability === 'BUSY';
}
