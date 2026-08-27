'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Filter, Search, X } from 'lucide-react';
import {
  BookingStatus,
  parseBookingOrderNumberSearch,
} from '@xidmetal/shared';
import { Select, type SelectOption } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BOOKING_STATUS_LABELS } from '@/lib/provider-labels';
import {
  type BookingStatusTab,
  type BookingStatusTabKey,
} from '@/lib/booking-list-query';

export type { BookingStatusTabKey } from '@/lib/booking-list-query';
export {
  buildBookingStatusTabs,
  getBookingListQueryParams,
  getBookingStatusQueryParams,
} from '@/lib/booking-list-query';

const STATUS_SELECT_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Bütün statuslar' },
  ...Object.values(BookingStatus).map((status) => ({
    value: status,
    label: BOOKING_STATUS_LABELS[status],
  })),
];

const ORDER_NUMBER_SEARCH_DEBOUNCE_MS = 300;

interface BookingStatusFiltersProps {
  tabs: BookingStatusTab[];
  activeTab: BookingStatusTabKey;
  onTabChange: (tab: BookingStatusTabKey) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onOrderNumberSearchChange: (value: string) => void;
}

export function BookingStatusFilters({
  tabs,
  activeTab,
  onTabChange,
  statusFilter,
  onStatusFilterChange,
  onOrderNumberSearchChange,
}: BookingStatusFiltersProps) {
  return (
    <div className="space-y-3">
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

      <BookingOrderNumberSearch
        onCommit={(value) => {
          onOrderNumberSearchChange(value);
          if (parseBookingOrderNumberSearch(value)?.type === 'equals') {
            onTabChange('all');
            onStatusFilterChange('all');
          }
        }}
      />
    </div>
  );
}

function BookingOrderNumberSearch({
  onCommit,
}: {
  onCommit: (value: string) => void;
}) {
  const inputId = useId();
  const hintId = useId();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [input, setInput] = useState('');
  const parsed = parseBookingOrderNumberSearch(input);
  const showHint = input.trim().length >= 3 && !parsed;

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const commit = (raw: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    onCommit(raw.trim());
  };

  const handleChange = (raw: string) => {
    setInput(raw);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!raw.trim()) {
      commit('');
      return;
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      onCommit(raw.trim());
    }, ORDER_NUMBER_SEARCH_DEBOUNCE_MS);
  };

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        commit(input);
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        Sifariş nömrəsinə görə axtarış
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={inputId}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={64}
          value={input}
          placeholder="Sifariş nömrəsi (məs. XM-26-000421)"
          aria-describedby={showHint ? hintId : undefined}
          className="h-11 pl-10 pr-11 font-mono tracking-wide"
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && input) {
              event.preventDefault();
              setInput('');
              commit('');
            }
          }}
        />
        {input ? (
          <button
            type="button"
            className="absolute right-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Axtarışı təmizlə"
            onClick={() => {
              setInput('');
              commit('');
            }}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {showHint ? (
        <p id={hintId} className="mt-1.5 text-xs text-muted-foreground" role="status">
          Tam nömrə (XM-26-000421) və ya ən azı 3 rəqəm yazın
        </p>
      ) : null}
    </form>
  );
}
