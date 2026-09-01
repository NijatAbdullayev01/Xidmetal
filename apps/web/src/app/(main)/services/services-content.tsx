'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, LayoutGrid, SearchX } from 'lucide-react';
import type { CategorySummary, ServiceSummary } from '@xidmetal/shared';
import { BecomeProviderLink } from '@/components/auth/become-provider-link';
import { PaginationNav } from '@/components/layout/pagination-nav';
import { buttonStyles } from '@/components/ui/button';
import { ServiceCard } from '@/components/services/service-card';
import { getCategoryIcon } from '@/lib/category-icons';
import { normalizeSearchText, scoreMatch } from '@/lib/search';
import { cn } from '@/lib/utils';

interface ServicesContentProps {
  categories: CategorySummary[];
  services: ServiceSummary[];
  total: number;
  page: number;
  totalPages: number;
  query: string;
  categoryId: string | null;
}

function buildServicesHref(input: {
  q?: string;
  categoryId?: string | null;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (input.q) params.set('q', input.q);
  if (input.categoryId) params.set('categoryId', input.categoryId);
  if (input.page && input.page > 1) params.set('page', String(input.page));
  const query = params.toString();
  return query ? `/services?${query}` : '/services';
}

export function ServicesContent({
  categories,
  services,
  total,
  page,
  totalPages,
  query,
  categoryId,
}: ServicesContentProps) {
  const router = useRouter();
  const hasQuery = query.length > 0;
  const activeCategory = categoryId;

  const categorySlugById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.slug])),
    [categories],
  );

  const activeCategoryName = categories.find((c) => c.id === activeCategory)?.name;

  const setCategory = (nextCategoryId: string | null) => {
    router.push(
      buildServicesHref({
        q: query || undefined,
        categoryId: nextCategoryId,
        page: 1,
      }),
    );
  };

  const categoryCardClass =
    'group relative flex w-[42vw] max-w-[10.25rem] shrink-0 snap-start touch-manipulation flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm transition-all duration-300 active:scale-[0.98] hover:border-brand/50 hover:shadow-md min-h-[128px] sm:min-h-[168px] sm:w-[11.5rem] sm:max-w-none sm:p-5 sm:active:scale-100 md:w-[12.5rem] lg:w-[calc((min(80rem,100vw-4rem)-5*1rem)/6)]';

  return (
    <>
      {!hasQuery ? (
        <section className="pt-8 pb-4 sm:pt-10 sm:pb-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Kateqoriyalar</h2>

            <div className="-mx-4 sm:-mx-6 lg:-mx-8">
              <div className="scrollbar-none snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth scroll-px-4 sm:scroll-px-6 lg:scroll-px-8">
                <div className="flex w-max gap-3 px-4 py-1 sm:gap-4 sm:px-6 sm:py-3 lg:px-8">
                  <Link
                    href="/services"
                    className={cn(
                      categoryCardClass,
                      !activeCategory && 'border-brand/60 ring-2 ring-brand/25',
                    )}
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/0 via-brand/0 to-brand/0 opacity-0 transition-opacity duration-300 group-hover:from-brand/8 group-hover:via-brand/4 group-hover:to-transparent group-hover:opacity-100"
                    />

                    <div className="relative flex items-start justify-between gap-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand/35 to-brand/15 ring-1 ring-brand/25 transition-all duration-300 group-hover:scale-105 group-hover:from-brand/50 group-hover:to-brand/25 group-hover:ring-brand/40 sm:h-14 sm:w-14 sm:rounded-2xl">
                        <LayoutGrid
                          className="h-5 w-5 text-foreground sm:h-7 sm:w-7"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                      </div>
                      <ArrowRight
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-dark/70 transition-all duration-300 sm:mt-0 sm:hidden sm:group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </div>

                    <div className="relative mt-3 flex flex-1 flex-col sm:mt-4">
                      <span className="text-[13px] font-semibold leading-tight text-foreground transition-colors group-hover:text-brand-dark sm:text-[15px]">
                        Hamısı
                      </span>
                      <span className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:text-xs sm:leading-relaxed">
                        Bütün xidmətlər
                      </span>
                    </div>

                    <ArrowRight
                      className="relative mt-3 hidden h-4 w-4 text-brand-dark opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100 sm:block"
                      aria-hidden
                    />
                  </Link>

                  {categories.map((category) => {
                    const Icon = getCategoryIcon(category.slug);
                    const isActive = activeCategory === category.id;

                    return (
                      <Link
                        key={category.id}
                        href={`/categories/${category.slug}`}
                        prefetch
                        className={cn(
                          categoryCardClass,
                          isActive && 'border-brand/60 ring-2 ring-brand/25',
                        )}
                      >
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/0 via-brand/0 to-brand/0 opacity-0 transition-opacity duration-300 group-hover:from-brand/8 group-hover:via-brand/4 group-hover:to-transparent group-hover:opacity-100"
                        />

                        <div className="relative flex items-start justify-between gap-2">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand/35 to-brand/15 ring-1 ring-brand/25 transition-all duration-300 group-hover:scale-105 group-hover:from-brand/50 group-hover:to-brand/25 group-hover:ring-brand/40 sm:h-14 sm:w-14 sm:rounded-2xl">
                            <Icon
                              className="h-5 w-5 text-foreground sm:h-7 sm:w-7"
                              strokeWidth={1.75}
                              aria-hidden
                            />
                          </div>
                          <ArrowRight
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-dark/70 transition-all duration-300 sm:mt-0 sm:hidden sm:group-hover:translate-x-0.5"
                            aria-hidden
                          />
                        </div>

                        <div className="relative mt-3 flex flex-1 flex-col sm:mt-4">
                          <span className="text-[13px] font-semibold leading-tight text-foreground transition-colors group-hover:text-brand-dark sm:text-[15px]">
                            {category.name}
                          </span>
                          <span className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:text-xs sm:leading-relaxed">
                            {category.description ?? `${category.serviceCount} xidmət`}
                          </span>
                        </div>

                        <ArrowRight
                          className="relative mt-3 hidden h-4 w-4 text-brand-dark opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100 sm:block"
                          aria-hidden
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {activeCategoryName ?? (hasQuery ? 'Tapılan xidmətlər' : 'Bütün xidmətlər')}
              </h2>
              <p className="mt-1 text-muted-foreground">
                {total} xidmət tapıldı
                {hasQuery ? (
                  <span>
                    {' '}
                    · sorğu: <span className="font-medium text-foreground">{query}</span>
                  </span>
                ) : null}
              </p>
            </div>
            {(activeCategory || hasQuery) && (
              <div className="flex flex-wrap gap-3">
                {activeCategory ? (
                  <button
                    type="button"
                    onClick={() => setCategory(null)}
                    className="text-sm font-medium text-brand-dark transition-colors hover:text-brand-foreground"
                  >
                    Kateqoriya filtrini sıfırla
                  </button>
                ) : null}
                {hasQuery ? (
                  <Link
                    href={buildServicesHref({ categoryId: activeCategory })}
                    className="text-sm font-medium text-brand-dark transition-colors hover:text-brand-foreground"
                  >
                    Axtarışı təmizlə
                  </Link>
                ) : null}
              </div>
            )}
          </div>

          {services.length === 0 ? (
            <div className="mt-12 flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
              <SearchX className="h-10 w-10 text-muted-foreground/50" aria-hidden />
              <h3 className="mt-4 text-lg font-semibold">Xidmət tapılmadı</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {hasQuery
                  ? `«${query}» üçün uyğun aktiv xidmət yoxdur. Başqa sözlər yoxlayın və ya kateqoriyalara baxın.`
                  : 'Seçilmiş kateqoriyada hələ aktiv xidmət yoxdur. Bütün kateqoriyalara baxın.'}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {hasQuery || activeCategory ? (
                  <Link href="/services" className={buttonStyles('default', 'md')}>
                    Bütün xidmətlərə bax
                  </Link>
                ) : null}
              </div>
              {hasQuery && categories.length > 0 ? (
                <p className="mt-8 text-xs text-muted-foreground">
                  Bəlkə bunları axtarırsınız:{' '}
                  {categories
                    .filter(
                      (category) =>
                        scoreMatch(query, category.name, category.description) >= 40 ||
                        normalizeSearchText(category.name).includes(
                          normalizeSearchText(query).slice(0, 4),
                        ),
                    )
                    .slice(0, 3)
                    .map((category) => (
                      <Link
                        key={category.id}
                        href={`/categories/${category.slug}`}
                        className="mx-1 font-medium text-brand-dark underline-offset-2 hover:underline"
                      >
                        {category.name}
                      </Link>
                    ))}
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    categorySlug={categorySlugById.get(service.categoryId)}
                  />
                ))}
              </div>

              <PaginationNav
                page={page}
                totalPages={totalPages}
                hrefForPage={(nextPage) =>
                  buildServicesHref({
                    q: query || undefined,
                    categoryId: activeCategory,
                    page: nextPage,
                  })
                }
              />
            </>
          )}
        </div>
      </section>

      <section className="border-t border-border py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand to-brand-light px-5 py-10 text-center sm:px-16 sm:py-14">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/20 blur-2xl"
            />
            <h2 className="relative text-2xl font-bold text-brand-foreground sm:text-3xl">
              Öz xidmətinizi təklif edin
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-brand-foreground/80">
              Xidmət verən kimi qeydiyyatdan keçin və yeni xidmət alanlara çatın.
            </p>
            <BecomeProviderLink className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-foreground px-8 py-3.5 font-semibold text-brand transition-colors hover:bg-brand-foreground/90">
              Xidmət verən ol
              <ArrowRight className="h-5 w-5" />
            </BecomeProviderLink>
          </div>
        </div>
      </section>
    </>
  );
}
