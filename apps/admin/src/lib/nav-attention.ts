import {
  formatCountedLabel,
  formatTabAttentionPrefix,
} from '@xidmetal/shared';

export interface AdminNavAttentionCounts {
  providersUnverified: number;
  servicesPendingReview: number;
  reviewsPending: number;
  reportsPending: number;
}

export type AdminNavAttentionHref = '/providers' | '/services' | '/reviews' | '/reports';

export type AdminTabQueueId = 'reports' | 'providers' | 'services' | 'reviews';

const ATTENTION_BY_HREF: Record<AdminNavAttentionHref, keyof AdminNavAttentionCounts> = {
  '/providers': 'providersUnverified',
  '/services': 'servicesPendingReview',
  '/reviews': 'reviewsPending',
  '/reports': 'reportsPending',
};

/** Təzə gələn növbə tab-da əvvəl — təhlükəsizlik (şikayət) prioritetdə. */
const QUEUE_TAB_ORDER: {
  id: AdminTabQueueId;
  key: keyof AdminNavAttentionCounts;
  singular: string;
  plural: string;
}[] = [
  { id: 'reports', key: 'reportsPending', singular: 'Şikayət', plural: 'şikayət' },
  {
    id: 'providers',
    key: 'providersUnverified',
    singular: 'Xidmət verən təsdiqi',
    plural: 'xidmət verən təsdiqi',
  },
  {
    id: 'services',
    key: 'servicesPendingReview',
    singular: 'Xidmət yoxlaması',
    plural: 'xidmət yoxlaması',
  },
  { id: 'reviews', key: 'reviewsPending', singular: 'Rəy yoxlaması', plural: 'rəy yoxlaması' },
];

export function isAdminNavAttentionHref(href: string): href is AdminNavAttentionHref {
  return href === '/providers' || href === '/services' || href === '/reviews' || href === '/reports';
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
  return QUEUE_TAB_ORDER.some((queue) => next[queue.key] > prev[queue.key]);
}

export function bumpedAdminQueueId(
  prev: AdminNavAttentionCounts | null,
  next: AdminNavAttentionCounts,
): AdminTabQueueId | null {
  if (prev === null) return null;
  const increased = QUEUE_TAB_ORDER.find((queue) => next[queue.key] > prev[queue.key]);
  return increased?.id ?? null;
}

export function formatAttentionLiveMessage(counts: AdminNavAttentionCounts): string {
  const parts: string[] = [];
  if (counts.reportsPending > 0) {
    parts.push(`${counts.reportsPending} şikayət gözləyir`);
  }
  if (counts.providersUnverified > 0) {
    parts.push(`${counts.providersUnverified} xidmət verən təsdiq gözləyir`);
  }
  if (counts.servicesPendingReview > 0) {
    parts.push(`${counts.servicesPendingReview} xidmət yoxlama gözləyir`);
  }
  if (counts.reviewsPending > 0) {
    parts.push(`${counts.reviewsPending} rəy yoxlama gözləyir`);
  }
  return parts.join('. ');
}

/** Admin tab: `(Şikayət, xidmət yoxlaması) İdarə etmə paneli | Xidmətal` */
export function adminQueueTabPrefix(
  counts: AdminNavAttentionCounts,
  bumpedId?: AdminTabQueueId | null,
): string | null {
  const items = QUEUE_TAB_ORDER.filter((queue) => counts[queue.key] > 0).sort((a, b) => {
    if (a.id === bumpedId) return -1;
    if (b.id === bumpedId) return 1;
    return 0;
  });
  const labels = items
    .map((queue) => formatCountedLabel(counts[queue.key], queue.singular, queue.plural))
    .filter((label): label is string => label !== null);
  return formatTabAttentionPrefix(labels);
}
