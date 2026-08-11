'use client';

import { Filter } from 'lucide-react';
import { BookingStatus } from '@xidmetal/shared';
import { Select, type SelectOption } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  BOOKING_STATUS_LABELS,
  ACTIVE_BOOKING_TAB_STATUSES,
} from '@/lib/provider-labels';

export type BookingStatusTabKey =
  | 'all'
  | 'pending'
  | 'active'
  | 'completed'
  | 'cancelled';

type StatusTab = {
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

const STATUS_SELECT_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Bütün statuslar' },
  ...Object.values(BookingStatus).map((status) => ({
    value: status,
    label: BOOKING_STATUS_LABELS[status],
  })),
];

export function buildBookingStatusTabs(
  cancelledLabel = 'Ləğv / imtina',
): StatusTab[] {
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
  tabs: StatusTab[],
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

interface BookingStatusFiltersProps {
  tabs: StatusTab[];
  activeTab: BookingStatusTabKey;
  onTabChange: (tab: BookingStatusTabKey) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

export function BookingStatusFilters({
  tabs,
  activeTab,
  onTabChange,
  statusFilter,
  onStatusFilterChange,
}: BookingStatusFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              onTabChange(tab.key);
              onStatusFilterChange('all');
            }}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.key && statusFilter === 'all'
                ? 'bg-brand text-brand-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Select
        id="booking-status-filter"
        className="w-full sm:w-52 sm:shrink-0"
        value={statusFilter}
        onChange={onStatusFilterChange}
        options={STATUS_SELECT_OPTIONS}
        placeholder="Status"
        triggerIcon={Filter}
        ariaLabel="Status filteri"
        align="end"
        size="sm"
        panelClassName="translate-x-3"
      />
    </div>
  );
}
