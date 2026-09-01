'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, SlidersHorizontal, Star, X } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export interface CategoryFilterState {
  serviceTypes: string[];
  minPrice: string;
  maxPrice: string;
  minRating: number | null;
}

export const EMPTY_CATEGORY_FILTERS: CategoryFilterState = {
  serviceTypes: [],
  minPrice: '',
  maxPrice: '',
  minRating: null,
};

const RATING_OPTIONS = [
  { value: 4, label: '4 və yuxarı' },
  { value: 3, label: '3 və yuxarı' },
  { value: 2, label: '2 və yuxarı' },
] as const;

/** Dar sidebar-da number input-ların daşmaması üçün */
const PRICE_INPUT_CLASS =
  'h-10 min-w-0 px-2.5 tabular-nums [appearance:textfield] focus-visible:ring-offset-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

type FilterSectionKey = 'types' | 'price' | 'rating';

export function countActiveFilters(filters: CategoryFilterState): number {
  let count = 0;
  if (filters.serviceTypes.length > 0) count += 1;
  if (filters.minPrice.trim() !== '' || filters.maxPrice.trim() !== '') count += 1;
  if (filters.minRating !== null) count += 1;
  return count;
}

export function parsePriceBound(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function formatPriceSummary(filters: CategoryFilterState): string | null {
  const min = parsePriceBound(filters.minPrice);
  const max = parsePriceBound(filters.maxPrice);
  if (min === null && max === null) return null;
  if (min !== null && max !== null) return `${formatPrice(min)} – ${formatPrice(max)}`;
  if (min !== null) return `${formatPrice(min)}+`;
  return `${formatPrice(max!)}-ə qədər`;
}

interface CategoryFiltersProps {
  filters: CategoryFilterState;
  onChange: (next: CategoryFilterState) => void;
  onReset: () => void;
  serviceTypes: readonly string[];
  typeCounts: Record<string, number>;
  resultCount: number;
  /** Drawer-də xarici başlıq olanda daxili başlığı gizlət */
  hideHeader?: boolean;
  /**
   * Alt CTA (nəticə sayı + sıfırla). Drawer və desktop sticky panel üçün.
   * Orta hissə scroll olur, footer sabit qalır.
   */
  showFooterActions?: boolean;
  onApply?: () => void;
  idPrefix?: string;
}

export function CategoryFilters({
  filters,
  onChange,
  onReset,
  serviceTypes,
  typeCounts,
  resultCount,
  hideHeader = false,
  showFooterActions = false,
  onApply,
  idPrefix = 'filter',
}: CategoryFiltersProps) {
  const activeCount = countActiveFilters(filters);
  const hasPriceFilter =
    filters.minPrice.trim() !== '' || filters.maxPrice.trim() !== '';
  const priceSummary = formatPriceSummary(filters);

  /**
   * Accordion: eyni anda yalnız bir bölmə açıqdır.
   * Xidmət növü əsas fasettir — default açıq.
   */
  const [openSection, setOpenSection] = useState<FilterSectionKey | null>(() => {
    if (serviceTypes.length > 0) return 'types';
    if (hasPriceFilter) return 'price';
    if (filters.minRating !== null) return 'rating';
    return 'price';
  });

  const toggleSection = (key: FilterSectionKey) => {
    setOpenSection((prev) => (prev === key ? null : key));
  };

  const toggleType = (type: string) => {
    const selected = filters.serviceTypes.includes(type)
      ? filters.serviceTypes.filter((item) => item !== type)
      : [...filters.serviceTypes, type];
    onChange({ ...filters, serviceTypes: selected });
  };

  return (
    <div
      className={cn(
        'flex flex-col',
        showFooterActions ? 'min-h-0 flex-1' : 'h-full',
      )}
    >
      {!hideHeader ? (
        <div className="-mx-5 flex shrink-0 items-start gap-3 border-b border-border/70 bg-muted/45 px-5 py-4">
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/20"
            aria-hidden
          >
            <SlidersHorizontal className="h-4 w-4 text-foreground" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold tracking-tight">Filtrlər</h2>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              Növ, qiymət və reytinqə görə seçin
            </p>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          'divide-y divide-border/70',
          !hideHeader && 'mt-4',
          showFooterActions &&
            'min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth pb-2 pr-1.5 scrollbar-thin',
        )}
      >
        {/* Xidmət növü */}
        {serviceTypes.length > 0 ? (
          <FilterDisclosure
            id={`${idPrefix}-section-types`}
            title="Xidmət növü"
            open={openSection === 'types'}
            onToggle={() => toggleSection('types')}
            badge={
              filters.serviceTypes.length > 0
                ? `${filters.serviceTypes.length} seçildi`
                : null
            }
          >
            <ul
              className={cn(
                'space-y-1',
                !showFooterActions &&
                  'max-h-56 overflow-y-auto overscroll-contain scroll-smooth pr-1 scrollbar-thin',
              )}
            >
              {serviceTypes.map((type) => {
                const checked = filters.serviceTypes.includes(type);
                const count = typeCounts[type] ?? 0;
                const inputId = `${idPrefix}-type-${type}`;

                return (
                  <li key={type}>
                    <label
                      htmlFor={inputId}
                      className={cn(
                        'flex min-h-11 min-w-0 cursor-pointer touch-manipulation items-center gap-3 rounded-xl px-2 py-2 transition-colors',
                        checked ? 'bg-brand/15 ring-1 ring-brand/30' : 'hover:bg-muted/70',
                        count === 0 && !checked && 'opacity-50',
                      )}
                    >
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleType(type)}
                        className="h-4 w-4 shrink-0 rounded border-border text-brand accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-0"
                      />
                      <span className="min-w-0 flex-1 text-sm leading-snug text-foreground">
                        {type}
                      </span>
                      <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                        {count}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </FilterDisclosure>
        ) : null}

        {/* Qiymət */}
        <FilterDisclosure
          id={`${idPrefix}-section-price`}
          title="Qiymət aralığı"
          open={openSection === 'price'}
          onToggle={() => toggleSection('price')}
          summary={openSection !== 'price' ? priceSummary : null}
          badge={hasPriceFilter ? 1 : null}
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0 space-y-1.5">
              <Label
                htmlFor={`${idPrefix}-min-price`}
                className="block text-xs text-muted-foreground"
              >
                Min (AZN)
              </Label>
              <Input
                id={`${idPrefix}-min-price`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="0"
                value={filters.minPrice}
                onChange={(event) =>
                  onChange({ ...filters, minPrice: event.target.value })
                }
                className={PRICE_INPUT_CLASS}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label
                htmlFor={`${idPrefix}-max-price`}
                className="block text-xs text-muted-foreground"
              >
                Maks (AZN)
              </Label>
              <Input
                id={`${idPrefix}-max-price`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="—"
                value={filters.maxPrice}
                onChange={(event) =>
                  onChange({ ...filters, maxPrice: event.target.value })
                }
                className={PRICE_INPUT_CLASS}
              />
            </div>
          </div>
        </FilterDisclosure>

        {/* Reytinq */}
        <FilterDisclosure
          id={`${idPrefix}-section-rating`}
          title="Minimum reytinq"
          open={openSection === 'rating'}
          onToggle={() => toggleSection('rating')}
          summary={
            openSection !== 'rating' && filters.minRating !== null
              ? `${filters.minRating}+ ulduz`
              : null
          }
          badge={filters.minRating !== null ? 1 : null}
        >
          <div
            className="space-y-1"
            role="radiogroup"
            aria-label="Minimum reytinq"
          >
            <button
              type="button"
              role="radio"
              aria-checked={filters.minRating === null}
              onClick={() => onChange({ ...filters, minRating: null })}
              className={cn(
                'flex min-h-11 w-full min-w-0 touch-manipulation items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-0',
                filters.minRating === null
                  ? 'bg-brand/15 font-medium ring-1 ring-brand/30'
                  : 'hover:bg-muted/70',
              )}
            >
              <RatingRadioDot active={filters.minRating === null} />
              Hamısı
            </button>

            {RATING_OPTIONS.map((option) => {
              const active = filters.minRating === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() =>
                    onChange({
                      ...filters,
                      minRating: active ? null : option.value,
                    })
                  }
                  className={cn(
                    'flex min-h-11 w-full min-w-0 touch-manipulation items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-0',
                    active
                      ? 'bg-brand/15 ring-1 ring-brand/30'
                      : 'hover:bg-muted/70',
                  )}
                >
                  <RatingRadioDot active={active} />
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="flex items-center gap-0.5" aria-hidden>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={cn(
                            'h-3.5 w-3.5',
                            index < option.value
                              ? 'fill-brand text-brand'
                              : 'text-muted-foreground/25',
                          )}
                        />
                      ))}
                    </span>
                    <span className="text-sm text-foreground">{option.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </FilterDisclosure>
      </div>

      {showFooterActions ? (
        <div className="mt-auto shrink-0 border-t border-border bg-background pt-4">
          <Button type="button" className="w-full min-h-11" onClick={onApply}>
            Nəticələri göstər ({resultCount})
          </Button>
          {activeCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              className="mt-2 w-full min-h-11"
              onClick={onReset}
            >
              Filtrləri sıfırla
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface FilterDisclosureProps {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  /** Bağlı olanda aktiv seçimin qısa xülasəsi */
  summary?: string | null;
  badge?: number | string | null;
  children: ReactNode;
}

function FilterDisclosure({
  id,
  title,
  open,
  onToggle,
  summary,
  badge,
  children,
}: FilterDisclosureProps) {
  const reactId = useId();
  const panelId = `${id}-panel`;
  const titleId = `${id}-title-${reactId}`;
  const showBadge =
    badge != null && badge !== '' && !(typeof badge === 'number' && badge <= 0);

  return (
    <div className="px-0.5 py-1 first:pt-0 last:pb-0">
      <h3>
        <button
          type="button"
          id={titleId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className={cn(
            'group flex w-full touch-manipulation items-center gap-2 rounded-xl px-1.5 py-2.5 text-left',
            'transition-colors hover:bg-muted/50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-0',
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{title}</span>
              {showBadge ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold tabular-nums text-brand-foreground">
                  {badge}
                </span>
              ) : null}
            </span>
            {summary ? (
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {summary}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out',
              'group-hover:text-foreground',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={titleId}
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className="px-1.5 pb-3 pt-0.5"
            {...(!open ? { inert: true as const } : {})}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function RatingRadioDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
        active ? 'border-brand bg-brand' : 'border-border bg-background',
      )}
      aria-hidden
    >
      {active ? <span className="h-1.5 w-1.5 rounded-full bg-brand-foreground" /> : null}
    </span>
  );
}

interface ActiveFilterChipsProps {
  filters: CategoryFilterState;
  onChange: (next: CategoryFilterState) => void;
}

export function ActiveFilterChips({ filters, onChange }: ActiveFilterChipsProps) {
  const chips: Array<{ key: string; label: string; clear: () => void }> = [];

  for (const type of filters.serviceTypes) {
    chips.push({
      key: `type-${type}`,
      label: type,
      clear: () =>
        onChange({
          ...filters,
          serviceTypes: filters.serviceTypes.filter((item) => item !== type),
        }),
    });
  }

  const min = parsePriceBound(filters.minPrice);
  const max = parsePriceBound(filters.maxPrice);
  if (min !== null || max !== null) {
    const label =
      min !== null && max !== null
        ? `${formatPrice(min)} – ${formatPrice(max)}`
        : min !== null
          ? `${formatPrice(min)}+`
          : `${formatPrice(max!)}-ə qədər`;

    chips.push({
      key: 'price',
      label,
      clear: () => onChange({ ...filters, minPrice: '', maxPrice: '' }),
    });
  }

  if (filters.minRating !== null) {
    chips.push({
      key: 'rating',
      label: `${filters.minRating}+ ulduz`,
      clear: () => onChange({ ...filters, minRating: null }),
    });
  }

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const updateHint = () => {
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    };

    updateHint();
    el.addEventListener('scroll', updateHint, { passive: true });
    const ro = new ResizeObserver(updateHint);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', updateHint);
      ro.disconnect();
    };
  }, [chips.length]);

  if (chips.length === 0) return null;

  return (
    <div
      ref={scrollerRef}
      className={cn(
        'scrollbar-none max-w-full overflow-x-auto overscroll-x-contain touch-pan-x',
        canScrollRight && 'scroll-hint-right',
      )}
    >
      <div className="flex w-max min-w-full items-center gap-2">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={chip.clear}
            className="inline-flex h-8 shrink-0 touch-manipulation items-center gap-1.5 rounded-lg border border-brand/40 bg-brand/10 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-brand/20"
          >
            <span className="max-w-[14rem] truncate">{chip.label}</span>
            <X className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
            <span className="sr-only">sil</span>
          </button>
        ))}
      </div>
    </div>
  );
}
