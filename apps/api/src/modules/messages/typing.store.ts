/** Ephemeral typing — DB-backed (multi-instance). TTL bitəndə oxunanda silinir. */
import { PrismaService } from '../../common/database/prisma.service';

export const TYPING_TTL_MS = 4_000;

export async function setTypingDb(
  prisma: PrismaService,
  conversationId: string,
  userId: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + TYPING_TTL_MS);
  await prisma.typingPresence.upsert({
    where: { conversationId },
    create: { conversationId, userId, expiresAt },
    update: { userId, expiresAt },
  });
}

export async function clearTypingDb(
  prisma: PrismaService,
  conversationId: string,
  userId: string,
): Promise<void> {
  await prisma.typingPresence.deleteMany({
    where: { conversationId, userId },
  });
}

export async function isPeerTypingDb(
  prisma: PrismaService,
  conversationId: string,
  viewerId: string,
): Promise<boolean> {
  const entry = await prisma.typingPresence.findUnique({
    where: { conversationId },
  });
  if (!entry) return false;

  if (entry.expiresAt.getTime() < Date.now()) {
    await prisma.typingPresence.deleteMany({ where: { conversationId } });
    return false;
  }

  return entry.userId !== viewerId;
}
