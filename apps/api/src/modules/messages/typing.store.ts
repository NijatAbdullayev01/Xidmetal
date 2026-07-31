/** Ephemeral typing state — DB-yə yazılmır; TTL bitəndə silinir. */
const TYPING_TTL_MS = 4_000;

type TypingEntry = {
  userId: string;
  expiresAt: number;
};

const typingByConversation = new Map<string, TypingEntry>();

export function setTyping(conversationId: string, userId: string): void {
  typingByConversation.set(conversationId, {
    userId,
    expiresAt: Date.now() + TYPING_TTL_MS,
  });
}

export function clearTyping(conversationId: string, userId: string): void {
  const entry = typingByConversation.get(conversationId);
  if (entry?.userId === userId) {
    typingByConversation.delete(conversationId);
  }
}

export function isPeerTyping(conversationId: string, viewerId: string): boolean {
  const entry = typingByConversation.get(conversationId);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    typingByConversation.delete(conversationId);
    return false;
  }
  return entry.userId !== viewerId;
}
