'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { Filter, SlidersHorizontal, X } from 'lucide-react';
import type { CategorySummary, ServiceSummary } from '@xidmetal/shared';
import { ServiceCard } from '@/components/services/service-card';
import {
  ActiveFilterChips,
  CategoryFilters,
  EMPTY_CATEGORY_FILTERS,
  countActiveFilters,
  parsePriceBound,
  type CategoryFilterState,
} from '@/components/services/category-filters';
import {
  DEFAULT_SERVICE_SORT,
  ServiceSortSelect,
  sortServices,
  type ServiceSortOption,
} from '@/components/services/service-sort';
import { Button } from '@/components/ui/button';
import { getServiceTypesForCategory } from '@/lib/service-types';
import { useScrollLock } from '@/hooks/use-scroll-lock';

interface CategoryContentProps {
  category: CategorySummary;
  services: ServiceSummary[];
}

function resolveInitialFilters(
  services: ServiceSummary[],
  serviceTypes: readonly string[],
  initialServiceType?: string,
): CategoryFilterState {
  if (!initialServiceType) return EMPTY_CATEGORY_FILTERS;

  const exactType = serviceTypes.find((type) => type === initialServiceType);
  if (exactType) {
    return { ...EMPTY_CATEGORY_FILTERS, serviceTypes: [exactType] };
  }

  // Provider custom title — siyahıda olmasa belə filtrə sal
  const hasMatchingService = services.some(
    (service) => service.title === initialServiceType,
  );
  if (hasMatchingService) {
    return { ...EMPTY_CATEGORY_FILTERS, serviceTypes: [initialServiceType] };
  }

  return EMPTY_CATEGORY_FILTERS;
}

export function CategoryContent({
  category,
  services,
}: CategoryContentProps) {
  const searchParams = useSearchParams();
  const initialServiceType = searchParams.get('type')?.trim() || undefined;

  const initialServiceTypes = useMemo(() => {
    const predefined = getServiceTypesForCategory(category.slug);
    const base =
      predefined && predefined.length > 0
        ? [...predefined]
        : Array.from(
            new Set(services.map((service) => service.title.trim()).filter(Boolean)),
          ).sort((a, b) => a.localeCompare(b, 'az'));

    // Axtarışdan gələn növ siyahıda olmasa (custom title) — filtr UI-da görünsün
    if (initialServiceType && !base.includes(initialServiceType)) {
      return [initialServiceType, ...base];
    }

    return base;
  }, [category.slug, services, initialServiceType]);

  const [filters, setFilters] = useState<CategoryFilterState>(() =>
    resolveInitialFilters(services, initialServiceTypes, initialServiceType),
  );
  const [sort, setSort] = useState<ServiceSortOption>(DEFAULT_SERVICE_SORT);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [emptyMinHeight, setEmptyMinHeight] = useState<number | undefined>();
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const emptyStateRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useScrollLock(mobileOpen);

  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const serviceTypes = initialServiceTypes;

  // Yalnız URL-dəki type dəyişəndə filtri yenilə (istifadəçi seçimini silmə)
  useEffect(() => {
    setFilters(resolveInitialFilters(services, serviceTypes, initialServiceType));
    // services/serviceTypes eyni səhifədə sabit qalır; asılılıq type-dir
    // eslint-disable-next-line react-hooks/exhaustive-deps -- URL type sync
  }, [initialServiceType]);

  const filteredServices = useMemo(
    () => applyFilters(services, filters),
    [services, filters],
  );

  const visibleServices = useMemo(
    () => sortServices(filteredServices, sort),
    [filteredServices, sort],
  );

  const typeCounts = useMemo(() => {
    const withoutTypes = applyFilters(services, { ...filters, serviceTypes: [] });
    const counts: Record<string, number> = {};

    for (const type of serviceTypes) {
      counts[type] = withoutTypes.filter((service) => service.title === type).length;
    }

    return counts;
  }, [services, filters, serviceTypes]);

  const activeCount = countActiveFilters(filters);
  const hasServices = services.length > 0;
  const showEmptyState = hasServices && visibleServices.length === 0;

  const resetFilters = () => setFilters(EMPTY_CATEGORY_FILTERS);

  /**
   * Boş state hündürlüyü = filtr paneli − yuxarıdakı toolbar/çip sahəsi.
   * Beləcə boş blokun dibi desktop-da filtr paneli ilə hizalanır;
   * accordion açılıb-bağlananda ResizeObserver ilə yenilənir.
   */
  useLayoutEffect(() => {
    if (!showEmptyState) {
      setEmptyMinHeight(undefined);
      return;
    }

    const panel = filterPanelRef.current;
    const results = resultsRef.current;
    const empty = emptyStateRef.current;
    if (!panel || !results || !empty) {
      setEmptyMinHeight(undefined);
      return;
    }

    const desktopQuery = window.matchMedia('(min-width: 1024px)');

    const measureAboveEmpty = (): number => {
      let above = 0;
      for (const child of results.children) {
        if (child === empty) break;
        const el = child as HTMLElement;
        const style = window.getComputedStyle(el);
        above +=
          el.offsetHeight +
          (Number.parseFloat(style.marginTop) || 0) +
          (Number.parseFloat(style.marginBottom) || 0);
      }
      const emptyStyle = window.getComputedStyle(empty);
      above += Number.parseFloat(emptyStyle.marginTop) || 0;
      return above;
    };

    const syncHeight = () => {
      if (!desktopQuery.matches) {
        setEmptyMinHeight(undefined);
        return;
      }
      const next = Math.max(0, panel.offsetHeight - measureAboveEmpty());
      setEmptyMinHeight(next);
    };

    syncHeight();

    const observer = new ResizeObserver(syncHeight);
    observer.observe(panel);
    observer.observe(results);
    desktopQuery.addEventListener('change', syncHeight);
    return () => {
      observer.disconnect();
      desktopQuery.removeEventListener('change', syncHeight);
    };
  }, [showEmptyState, filters, serviceTypes, typeCounts]);

  return (
    <section className="py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{category.name}</h1>
          {category.description ? (
            <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>
          ) : null}
        </div>

        {!hasServices ? (
          <p className="py-16 text-center text-muted-foreground">
            Bu kateqoriyada hələ aktiv xidmət yoxdur.
          </p>
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
            {/* Desktop sidebar */}
            <aside className="hidden w-72 shrink-0 lg:block xl:w-80">
              <div
                ref={filterPanelRef}
                className="sticky top-20 flex max-h-[calc(100vh-5.5rem)] flex-col overflow-hidden rounded-2xl border border-border/70 bg-card px-5 pb-5 shadow-sm"
              >
                <CategoryFilters
                  filters={filters}
                  onChange={setFilters}
                  onReset={resetFilters}
                  serviceTypes={serviceTypes}
                  typeCounts={typeCounts}
                  resultCount={filteredServices.length}
                  showFooterActions
                  onApply={() => {
                    document
                      .getElementById('category-results')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  idPrefix="desktop-filter"
                />
              </div>
            </aside>

            {/* Main content */}
            <div
              id="category-results"
              ref={resultsRef}
              className="min-w-0 flex-1 scroll-mt-24"
            >
              <div className="lg:hidden">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setMobileOpen(true)}
                  className="min-h-11 w-full touch-manipulation sm:w-auto"
                  aria-expanded={mobileOpen}
                  aria-controls="category-filters-drawer"
                >
                  <SlidersHorizontal className="h-4 w-4" aria-hidden />
                  Filtrlər
                  {activeCount > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold text-brand-foreground">
                      {activeCount}
                    </span>
                  ) : null}
                </Button>
              </div>

              {activeCount > 0 ? (
                <div className="mt-3 lg:mt-0">
                  <ActiveFilterChips
                    filters={filters}
                    onChange={setFilters}
                  />
                </div>
              ) : null}

              <div
                className={
                  activeCount > 0
                    ? 'mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2'
                    : 'mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 lg:mt-0'
                }
              >
                <p className="text-sm text-muted-foreground">
                  Tapılan xidmət (
                  <span className="font-semibold text-foreground">
                    {visibleServices.length}
                  </span>
                  )
                </p>
                <ServiceSortSelect value={sort} onChange={setSort} />
              </div>

              {showEmptyState ? (
                <div
                  ref={emptyStateRef}
                  className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center"
                  style={
                    emptyMinHeight !== undefined
                      ? { minHeight: emptyMinHeight }
                      : undefined
                  }
                >
                  <Filter className="h-10 w-10 text-muted-foreground/50" aria-hidden />
                  <h3 className="mt-4 text-lg font-semibold">Uyğun xidmət tapılmadı</h3>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    Seçilmiş filtrlərə uyğun nəticə yoxdur. Filtrləri yumşaldın və ya
                    sıfırlayın.
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                  {visibleServices.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      categorySlug={category.slug}
                      showCategoryHeader={false}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile filter drawer */}
      {mounted && mobileOpen
        ? createPortal(
            <div className="fixed inset-0 z-50 lg:hidden" id="category-filters-drawer">
              <button
                type="button"
                aria-label="Filtrləri bağla"
                className="absolute inset-0 bg-black/40"
                onClick={() => setMobileOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="absolute inset-y-0 left-0 flex w-[min(100%,22rem)] flex-col bg-background shadow-xl"
              >
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border bg-muted/45 px-4 py-3.5">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/20"
                      aria-hidden
                    >
                      <SlidersHorizontal className="h-4 w-4 text-foreground" />
                    </span>
                    <div className="min-w-0">
                      <h2 id={titleId} className="text-base font-semibold">
                        Filtrlər
                      </h2>
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                        Növ, qiymət və reytinqə görə seçin
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-lg hover:bg-background/80"
                    aria-label="Bağla"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
                  <CategoryFilters
                    filters={filters}
                    onChange={setFilters}
                    onReset={resetFilters}
                    serviceTypes={serviceTypes}
                    typeCounts={typeCounts}
                    resultCount={filteredServices.length}
                    hideHeader
                    showFooterActions
                    onApply={() => setMobileOpen(false)}
                    idPrefix="mobile-filter"
                  />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

function applyFilters(
  services: ServiceSummary[],
  filters: CategoryFilterState,
): ServiceSummary[] {
  const minPrice = parsePriceBound(filters.minPrice);
  const maxPrice = parsePriceBound(filters.maxPrice);

  return services.filter((service) => {
    if (filters.serviceTypes.length > 0 && !filters.serviceTypes.includes(service.title)) {
      return false;
    }

    // Qiymət 0 = razılaşma ilə — qiymət filtrindən keçir
    if (service.price > 0) {
      if (minPrice !== null && service.price < minPrice) return false;
      if (maxPrice !== null && service.price > maxPrice) return false;
    } else if (minPrice !== null && minPrice > 0) {
      return false;
    }

    if (filters.minRating !== null && service.averageRating < filters.minRating) {
      return false;
    }

    return true;
  });
}
