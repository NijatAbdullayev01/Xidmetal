'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { CategorySummary, ServiceSummary } from '@xidmetal/shared';
import { buttonStyles } from '@/components/ui/button';
import { ServiceCard } from '@/components/services/service-card';
import { getCategoryIcon } from '@/lib/category-icons';
import { cn } from '@/lib/utils';

interface ServicesContentProps {
  categories: CategorySummary[];
  services: ServiceSummary[];
}

export function ServicesContent({ categories, services }: ServicesContentProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categorySlugById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.slug])),
    [categories],
  );

  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return services.filter((service) => {
      const matchesCategory =
        !activeCategory || service.categoryId === activeCategory;
      const matchesSearch =
        !query ||
        service.title.toLowerCase().includes(query) ||
        service.description.toLowerCase().includes(query) ||
        service.categoryName.toLowerCase().includes(query) ||
        service.providerName.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [services, search, activeCategory]);

  const activeCategoryName = categories.find((c) => c.id === activeCategory)?.name;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand/15 via-brand/5 to-background">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-brand/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 left-0 h-56 w-56 rounded-full bg-brand/10 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-14 sm:px-6 lg:px-8 lg:pt-24 lg:pb-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-sm font-medium text-brand-foreground">
              <Sparkles className="h-4 w-4 text-brand-dark" aria-hidden />
              Minlərlə etibarlı xidmət bir yerdə
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Xidmətləri{' '}
              <span className="bg-gradient-to-r from-brand-dark to-brand bg-clip-text text-transparent">
                kəşf edin
              </span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground sm:text-xl">
              Təmizlikdən təmirə, gözəllikdən İT-yə — ehtiyacınıza uyğun peşəkarları
              tapın, müqayisə edin və sifariş verin.
            </p>
          </div>

          {/* Search */}
          <div className="mx-auto mt-10 max-w-2xl">
            <div className="relative flex items-center gap-2 rounded-2xl border border-border/80 bg-card/80 p-2 shadow-xl shadow-brand/5 backdrop-blur-sm">
              <Search className="ml-3 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Xidmət, kateqoriya və ya provider axtarın..."
                className="min-w-0 flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
                aria-label="Xidmət axtar"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="mr-1 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Axtarışı təmizlə"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-3 sm:mt-10 sm:max-w-none sm:gap-4">
            <div className="rounded-xl border border-border/60 bg-card/60 px-3 py-3 text-center backdrop-blur-sm sm:px-5 sm:py-4">
              <p className="text-xl font-bold text-brand-dark sm:text-2xl">{services.length}+</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">Aktiv xidmət</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/60 px-3 py-3 text-center backdrop-blur-sm sm:px-5 sm:py-4">
              <p className="text-xl font-bold text-brand-dark sm:text-2xl">{categories.length}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">Kateqoriya</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/60 px-3 py-3 text-center backdrop-blur-sm sm:px-5 sm:py-4">
              <p className="text-xl font-bold text-brand-dark sm:text-2xl">4.8 ★</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">Orta reytinq</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-b border-border bg-muted/30 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden />
              <h2 className="text-sm font-semibold">Kateqoriyalar</h2>
            </div>
            {activeCategory && (
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className="text-xs font-medium text-brand-dark transition-colors hover:text-brand-foreground"
              >
                Filtrı sıfırla
              </button>
            )}
          </div>

          <div className="scrollbar-none scroll-hint-right -mx-4 mt-4 overflow-x-auto overscroll-x-contain px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex w-max gap-2.5 pb-1">
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-200',
                  !activeCategory
                    ? 'border-brand bg-brand text-brand-foreground shadow-md shadow-brand/20'
                    : 'border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-foreground',
                )}
              >
                Hamısı
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-xs',
                    !activeCategory ? 'bg-brand-foreground/15' : 'bg-muted',
                  )}
                >
                  {services.length}
                </span>
              </button>

              {categories.map((category) => {
                const Icon = getCategoryIcon(category.slug);
                const isActive = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      setActiveCategory(isActive ? null : category.id)
                    }
                    className={cn(
                      'group inline-flex shrink-0 items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'border-brand bg-brand text-brand-foreground shadow-md shadow-brand/20'
                        : 'border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
                        isActive
                          ? 'bg-brand-foreground/15'
                          : 'bg-brand/15 group-hover:bg-brand/25',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    {category.name}
                    {category.serviceCount > 0 && (
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-xs',
                          isActive ? 'bg-brand-foreground/15' : 'bg-muted',
                        )}
                      >
                        {category.serviceCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Services grid */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {activeCategoryName ?? 'Bütün xidmətlər'}
              </h2>
              <p className="mt-1 text-muted-foreground">
                {filteredServices.length} xidmət tapıldı
                {search && (
                  <>
                    {' '}
                    — «<span className="font-medium text-foreground">{search}</span>»
                  </>
                )}
              </p>
            </div>
          </div>

          {filteredServices.length === 0 ? (
            <div className="mt-12 flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15">
                <Search className="h-8 w-8 text-brand-dark" aria-hidden />
              </div>
              <h3 className="mt-6 text-lg font-semibold">Xidmət tapılmadı</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Axtarış sorğunuz və ya seçilmiş kateqoriya üzrə nəticə yoxdur. Filtrləri
                dəyişdirin və ya bütün kateqoriyalara baxın.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setActiveCategory(null);
                }}
                className={buttonStyles('outline', 'md') + ' mt-6'}
              >
                Filtrləri təmizlə
              </button>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  categorySlug={categorySlugById.get(service.categoryId)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Category bento */}
      {categories.length > 0 && (
        <section className="border-t border-border bg-muted/40 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">Kateqoriyalar üzrə bax</h2>
              <p className="mt-3 text-muted-foreground">
                Maraqlı sahəni seçin və uyğun xidmətləri kəşf edin
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categories.slice(0, 8).map((category, index) => {
                const Icon = getCategoryIcon(category.slug);
                const isLarge = index === 0 || index === 3;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setActiveCategory(category.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={cn(
                      'group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 text-left shadow-sm transition-all duration-300 hover:border-brand/50 hover:shadow-md',
                      isLarge && 'sm:col-span-2 lg:col-span-2',
                    )}
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/0 to-brand/0 opacity-0 transition-opacity duration-300 group-hover:from-brand/10 group-hover:to-transparent group-hover:opacity-100"
                    />
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand/35 to-brand/10 ring-1 ring-brand/25 transition-transform duration-300 group-hover:scale-105">
                      <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                    </div>
                    <h3 className="relative mt-4 text-lg font-semibold transition-colors group-hover:text-brand-dark">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="relative mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    )}
                    <span className="relative mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-dark opacity-0 transition-all duration-300 group-hover:opacity-100">
                      Bax
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand to-brand-light px-5 py-10 text-center sm:px-16 sm:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/20 blur-2xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-brand-foreground/10 blur-2xl"
            />
            <div className="relative">
              <h2 className="text-2xl font-bold text-brand-foreground sm:text-3xl lg:text-4xl">
                Öz xidmətinizi təklif edin
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-brand-foreground/80">
                Xidmət verən kimi qeydiyyatdan keçin, xidmətinizi əlavə edin və minlərlə
                potensial müştəriyə çatın.
              </p>
              <Link
                href="/register?role=provider"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-foreground px-8 py-3.5 font-semibold text-brand transition-colors hover:bg-brand-foreground/90"
              >
                Provider ol
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
