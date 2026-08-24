export interface AdminNavAttentionCounts {
  providersUnverified: number;
  servicesPendingReview: number;
}

export type AdminNavAttentionHref = '/providers' | '/services';

const ATTENTION_BY_HREF: Record<AdminNavAttentionHref, keyof AdminNavAttentionCounts> = {
  '/providers': 'providersUnverified',
  '/services': 'servicesPendingReview',
};

export function isAdminNavAttentionHref(href: string): href is AdminNavAttentionHref {
  return href === '/providers' || href === '/services';
}

export function navAttentionCount(href: string, counts: AdminNavAttentionCounts | null): number {
  if (!counts || !isAdminNavAttentionHref(href)) return 0;
  return counts[ATTENTION_BY_HREF[href]];
}

export function formatAttentionCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}

export function formatNavAttentionAria(label: string, count: number): string | undefined {
  if (count <= 0) return undefined;
  return `${label}, ${count} gözləyən`;
}

/** İlk snapshot və azalma səs çalmır — yalnız növbə artanda. */
export function shouldPlayAttentionSound(
  prev: AdminNavAttentionCounts | null,
  next: AdminNavAttentionCounts,
): boolean {
  if (prev === null) return false;
  return (
    next.providersUnverified > prev.providersUnverified ||
    next.servicesPendingReview > prev.servicesPendingReview
  );
}

export function formatAttentionLiveMessage(counts: AdminNavAttentionCounts): string {
  const parts: string[] = [];
  if (counts.providersUnverified > 0) {
    parts.push(`${counts.providersUnverified} xidmət verən təsdiq gözləyir`);
  }
  if (counts.servicesPendingReview > 0) {
    parts.push(`${counts.servicesPendingReview} xidmət yoxlama gözləyir`);
  }
  return parts.join('. ');
}
