import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { EmailVerificationPurpose, PrismaClient } from '@prisma/client';

export const MAX_EMAIL_CODE_ATTEMPTS = 5;

type PrismaLike = Pick<PrismaClient, 'emailVerificationCode'>;

/**
 * E-poçt təsdiq kodunu yoxlayır; səhv cəhdləri sayır və limitdə kodu ləğv edir.
 * Uğurlu yoxlamada sətiri silmir — caller transaction-da təmizləyir.
 */
export async function assertValidEmailCode(
  prisma: PrismaLike,
  params: {
    userId: string;
    email: string;
    purpose: EmailVerificationPurpose;
    code: string;
  },
): Promise<{ id: string }> {
  const verification = await prisma.emailVerificationCode.findFirst({
    where: {
      userId: params.userId,
      email: params.email,
      purpose: params.purpose,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!verification) {
    throw new BadRequestException('Təsdiq kodu tapılmadı. Yenidən kod tələb edin');
  }

  if (verification.expiresAt < new Date()) {
    await prisma.emailVerificationCode.delete({ where: { id: verification.id } });
    throw new BadRequestException('Təsdiq kodunun müddəti bitib. Yenidən kod tələb edin');
  }

  const validCode = await bcrypt.compare(params.code, verification.codeHash);
  if (!validCode) {
    const nextAttempts = verification.attemptCount + 1;
    if (nextAttempts >= MAX_EMAIL_CODE_ATTEMPTS) {
      await prisma.emailVerificationCode.delete({ where: { id: verification.id } });
      throw new BadRequestException(
        'Çox sayda səhv cəhd. Yenidən kod tələb edin',
      );
    }

    await prisma.emailVerificationCode.update({
      where: { id: verification.id },
      data: { attemptCount: nextAttempts },
    });
    throw new BadRequestException('Təsdiq kodu səhvdir');
  }

  return { id: verification.id };
}
