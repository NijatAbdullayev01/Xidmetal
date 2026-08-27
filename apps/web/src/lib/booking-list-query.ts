import {
  BookingStatus,
  parseBookingOrderNumberSearch,
} from '@xidmetal/shared';
import { ACTIVE_BOOKING_TAB_STATUSES } from '@/lib/provider-labels';

export type BookingStatusTabKey =
  | 'all'
  | 'pending'
  | 'active'
  | 'completed'
  | 'cancelled';

export type BookingStatusTab = {
  key: BookingStatusTabKey;
  label: string;
  status?: BookingStatus;
  statuses?: BookingStatus[];
};

const BASE_TABS: readonly {
  key: BookingStatusTabKey;
  label?: string;
  status?: BookingStatus;
  statuses?: BookingStatus[];
}[] = [
  { key: 'all', label: 'Hamısı' },
  { key: 'pending', label: 'Gözləyən', status: BookingStatus.PENDING },
  {
    key: 'active',
    label: 'Aktiv',
    statuses: ACTIVE_BOOKING_TAB_STATUSES,
  },
  { key: 'completed', label: 'Tamamlanan', status: BookingStatus.COMPLETED },
  {
    key: 'cancelled',
    statuses: [BookingStatus.CANCELLED, BookingStatus.REJECTED],
  },
];

export function buildBookingStatusTabs(
  cancelledLabel = 'Ləğv / imtina',
): BookingStatusTab[] {
  return BASE_TABS.map((tab) => ({
    key: tab.key,
    status: tab.status,
    statuses: tab.statuses,
    label: tab.key === 'cancelled' ? cancelledLabel : (tab.label ?? ''),
  }));
}

export function getBookingStatusQueryParams(
  tab: BookingStatusTabKey,
  statusFilter: string,
  tabs: BookingStatusTab[],
): { status?: string; statuses?: string } {
  if (
    statusFilter !== 'all' &&
    (Object.values(BookingStatus) as string[]).includes(statusFilter)
  ) {
    return { status: statusFilter };
  }

  const currentTab = tabs.find((t) => t.key === tab);
  if (!currentTab) return {};
  if (currentTab.statuses) return { statuses: currentTab.statuses.join(',') };
  if (currentTab.status) return { status: currentTab.status };
  return {};
}

export function getBookingListQueryParams(
  tab: BookingStatusTabKey,
  statusFilter: string,
  tabs: BookingStatusTab[],
  orderNumberSearch = '',
): Record<string, string> {
  const trimmed = orderNumberSearch.trim();
  return {
    limit: '50',
    ...getBookingStatusQueryParams(tab, statusFilter, tabs),
    ...(parseBookingOrderNumberSearch(trimmed) ? { search: trimmed } : {}),
  };
}

/** Overview və siyahı səhifəsi eyni keşi paylaşsın */
export const DEFAULT_BOOKING_LIST_PARAMS: Record<string, string> =
  getBookingListQueryParams('all', 'all', buildBookingStatusTabs());

