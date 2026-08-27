export function formatAttentionCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}

export function formatNavAttentionAria(label: string, count: number): string | undefined {
  if (count <= 0) return undefined;
  return `${label}, ${count} gözləyən`;
}

/** Xidmətlərim: düzəliş növbəsi + oxunmamış təsdiq (düzəliş bildirişi status sayına daxildir). */
export function providerServicesNavAttention(input: {
  needsRevisionCount: number;
  unreadApprovedCount: number;
}): number {
  const revision = Math.max(0, input.needsRevisionCount);
  const approved = Math.max(0, input.unreadApprovedCount);
  return revision + approved;
}

export interface AttentionSnapshot {
  id: string | null;
  at: string | null;
}

/** İlk snapshot və eyni id səs çalmır — yalnız daha yeni hadisə. */
export function isNewerAttentionEvent(prev: AttentionSnapshot, next: AttentionSnapshot): boolean {
  return (
    next.id !== null &&
    next.at !== null &&
    next.id !== prev.id &&
    (prev.at === null || new Date(next.at).getTime() > new Date(prev.at).getTime())
  );
}
