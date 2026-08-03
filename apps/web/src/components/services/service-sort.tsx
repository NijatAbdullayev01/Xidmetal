'use client';

import { useMemo, type ComponentType } from 'react';
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpWideNarrow,
  Clock3,
  MessageSquareText,
  Star,
} from 'lucide-react';
import type { ServiceSummary } from '@xidmetal/shared';
import { Select, type SelectOption } from '@/components/ui/select';
import { cn } from '@/lib/utils';

/**
 * Kateqoriya siyahısı sıralaması.
 * Filtr deyil — ayrıca state; default API sırası ilə eyni (ən yenilər).
 */
export type ServiceSortOption =
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'rating_desc'
  | 'reviews_desc';

export const DEFAULT_SERVICE_SORT: ServiceSortOption = 'newest';

type SortIcon = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

export const SERVICE_SORT_OPTIONS: ReadonlyArray<{
  value: ServiceSortOption;
  label: string;
  description: string;
  icon: SortIcon;
}> = [
  {
    value: 'newest',
    label: 'Ən yenilər',
    description: 'Son əlavə olunanlar əvvəl',
    icon: Clock3,
  },
  {
    value: 'rating_desc',
    label: 'Ən yüksək reytinq',
    description: 'Ulduz sayına görə',
    icon: Star,
  },
  {
    value: 'reviews_desc',
    label: 'Ən çox rəy',
    description: 'Ən çox qiymətləndirilənlər',
    icon: MessageSquareText,
  },
  {
    value: 'price_asc',
    label: 'Ucuzdan bahaya',
    description: 'Ən aşağı qiymət əvvəl',
    icon: ArrowDownWideNarrow,
  },
  {
    value: 'price_desc',
    label: 'Bahadan ucuza',
    description: 'Ən yüksək qiymət əvvəl',
    icon: ArrowUpWideNarrow,
  },
] as const;

/** Qiymət 0 = razılaşma — artan/azalan sıralamada sonda qalsın */
function comparePrice(a: number, b: number, direction: 'asc' | 'desc'): number {
  const aNegotiated = a <= 0;
  const bNegotiated = b <= 0;
  if (aNegotiated && bNegotiated) return 0;
  if (aNegotiated) return 1;
  if (bNegotiated) return -1;
  return direction === 'asc' ? a - b : b - a;
}

function compareCreatedAtDesc(a: ServiceSummary, b: ServiceSummary): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function tieBreak(a: ServiceSummary, b: ServiceSummary): number {
  const byTitle = a.title.localeCompare(b.title, 'az');
  if (byTitle !== 0) return byTitle;
  return a.id.localeCompare(b.id);
}

export function sortServices(
  services: ServiceSummary[],
  sort: ServiceSortOption,
): ServiceSummary[] {
  const sorted = [...services];

  sorted.sort((a, b) => {
    let primary = 0;

    switch (sort) {
      case 'newest':
        primary = compareCreatedAtDesc(a, b);
        break;
      case 'price_asc':
        primary = comparePrice(a.price, b.price, 'asc');
        break;
      case 'price_desc':
        primary = comparePrice(a.price, b.price, 'desc');
        break;
      case 'rating_desc':
        primary = b.averageRating - a.averageRating;
        if (primary === 0) primary = b.reviewCount - a.reviewCount;
        break;
      case 'reviews_desc':
        primary = b.reviewCount - a.reviewCount;
        if (primary === 0) primary = b.averageRating - a.averageRating;
        break;
    }

    if (primary !== 0) return primary;
    if (sort !== 'newest') {
      const byDate = compareCreatedAtDesc(a, b);
      if (byDate !== 0) return byDate;
    }
    return tieBreak(a, b);
  });

  return sorted;
}

interface ServiceSortSelectProps {
  value: ServiceSortOption;
  onChange: (next: ServiceSortOption) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export function ServiceSortSelect({
  value,
  onChange,
  id = 'service-sort',
  className,
  disabled = false,
}: ServiceSortSelectProps) {
  const options = useMemo(
    (): SelectOption[] =>
      SERVICE_SORT_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
        description: option.description,
        icon: option.icon,
      })),
    [],
  );

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <span className="hidden shrink-0 text-sm text-muted-foreground sm:inline">
        Sırala
      </span>
      <Select
        id={id}
        value={value}
        onChange={(next) => onChange(next as ServiceSortOption)}
        options={options}
        disabled={disabled}
        size="sm"
        align="end"
        triggerIcon={ArrowUpDown}
        panelHeader="Nəticələri necə sıralayaq?"
        ariaLabel="Xidmətləri sırala"
        className="w-[min(100%,13.5rem)] sm:w-[15.5rem]"
      />
    </div>
  );
}
