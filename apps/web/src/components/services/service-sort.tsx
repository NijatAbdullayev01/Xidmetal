'use client';

import { useEffect, useId, useRef, useState, type ComponentType } from 'react';
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpWideNarrow,
  Check,
  ChevronDown,
  Clock3,
  MessageSquareText,
  Star,
} from 'lucide-react';
import type { ServiceSummary } from '@xidmetal/shared';
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
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      SERVICE_SORT_OPTIONS.findIndex((option) => option.value === value),
    ),
  );

  const selectedOption = SERVICE_SORT_OPTIONS.find(
    (option) => option.value === value,
  );
  const selected = selectedOption ?? {
    value: DEFAULT_SERVICE_SORT,
    label: 'Ən yenilər',
    description: 'Son əlavə olunanlar əvvəl',
    icon: Clock3,
  };

  useEffect(() => {
    if (!open) return;

    const selectedIndex = SERVICE_SORT_OPTIONS.findIndex(
      (option) => option.value === value,
    );
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);

    const frame = requestAnimationFrame(() => {
      optionRefs.current[selectedIndex]?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open]);

  const selectOption = (next: ServiceSortOption) => {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const moveActive = (delta: number) => {
    setActiveIndex((prev) => {
      const next =
        (prev + delta + SERVICE_SORT_OPTIONS.length) % SERVICE_SORT_OPTIONS.length;
      optionRefs.current[next]?.focus();
      return next;
    });
  };

  return (
    <div ref={rootRef} className={cn('relative flex min-w-0 items-center gap-2', className)}>
      <span className="hidden shrink-0 text-sm text-muted-foreground sm:inline">
        Sırala
      </span>

      <div className="relative min-w-0">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-label="Xidmətləri sırala"
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            'flex h-9 min-h-9 w-[min(100%,13.5rem)] items-center gap-2 rounded-lg border bg-background px-2.5 text-xs transition-colors sm:h-10 sm:min-h-10 sm:w-[15.5rem] sm:px-3 sm:text-sm',
            'touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            open
              ? 'border-brand ring-2 ring-brand/30'
              : 'border-border hover:border-border/80 hover:bg-muted/40',
          )}
        >
          <ArrowUpDown
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate text-left font-medium text-foreground">
            {selected.label}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </button>

        {open ? (
          <div
            id={listboxId}
            role="listbox"
            aria-label="Sıralama seçimləri"
            aria-activedescendant={`${listboxId}-option-${activeIndex}`}
            className={cn(
              'absolute right-0 z-40 mt-1.5 w-[min(calc(100vw-2rem),13.5rem)] origin-top-right overflow-hidden rounded-lg border border-border bg-card shadow-lg sm:mt-2 sm:w-[min(calc(100vw-2rem),18.5rem)] sm:rounded-xl',
              'motion-safe:animate-[picker-in_160ms_ease-out]',
            )}
          >
            <div className="hidden border-b border-border/70 bg-muted/40 px-3.5 py-2.5 sm:block">
              <p className="text-xs font-medium text-muted-foreground">
                Nəticələri necə sıralayaq?
              </p>
            </div>

            <div className="p-1 sm:p-1.5">
              {SERVICE_SORT_OPTIONS.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                const Icon = option.icon;

                return (
                  <button
                    key={option.value}
                    ref={(node) => {
                      optionRefs.current[index] = node;
                    }}
                    id={`${listboxId}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={isActive ? 0 : -1}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectOption(option.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        moveActive(1);
                      } else if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        moveActive(-1);
                      } else if (event.key === 'Home') {
                        event.preventDefault();
                        setActiveIndex(0);
                        optionRefs.current[0]?.focus();
                      } else if (event.key === 'End') {
                        event.preventDefault();
                        const last = SERVICE_SORT_OPTIONS.length - 1;
                        setActiveIndex(last);
                        optionRefs.current[last]?.focus();
                      } else if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        selectOption(option.value);
                      } else if (event.key === 'Tab') {
                        setOpen(false);
                      }
                    }}
                    className={cn(
                      'flex w-full touch-manipulation items-center gap-2 rounded-md px-2 py-2 text-left transition-colors sm:gap-3 sm:rounded-lg sm:px-2.5 sm:py-2.5',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-0',
                      isSelected
                        ? 'bg-brand/15 ring-1 ring-brand/30'
                        : isActive
                          ? 'bg-muted/80'
                          : 'hover:bg-muted/70',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md sm:h-9 sm:w-9 sm:rounded-lg',
                        isSelected
                          ? 'bg-brand text-brand-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                      aria-hidden
                    >
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-foreground sm:text-sm">
                        {option.label}
                      </span>
                      <span className="mt-0.5 hidden text-xs leading-snug text-muted-foreground sm:block">
                        {option.description}
                      </span>
                    </span>

                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full sm:h-5 sm:w-5',
                        isSelected
                          ? 'bg-brand text-brand-foreground'
                          : 'opacity-0',
                      )}
                      aria-hidden
                    >
                      <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={2.5} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
