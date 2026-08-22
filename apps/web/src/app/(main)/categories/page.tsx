import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { CategorySummary } from '@xidmetal/shared';
import { CategoryPageSkeleton } from '@/components/ui/page-skeletons';
import { getCategoryIcon } from '@/lib/category-icons';
import { api } from '@/lib/api';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Kateqoriyalar',
  description:
    'Xidmətal-da bütün xidmət kateqoriyalarını kəşf edin — təmizlik, təmir, gözəllik və daha çox.',
};

async function loadCategories(): Promise<CategorySummary[]> {
  try {
    return await api.categories();
  } catch {
    return [];
  }
}

async function CategoriesIndexContent() {
  const categories = await loadCategories();

  return (
    <section className="pb-16 pt-8 sm:pb-20 sm:pt-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Kateqoriyalar</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Axtardığınız xidmət növünü seçin və etibarlı xidmət verənləri müqayisə edin.
          </p>
        </div>

        {categories.length === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">
            Hal-hazırda aktiv kateqoriya yoxdur. Tezliklə yenilənəcək.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {categories.map((category) => {
              const Icon = getCategoryIcon(category.slug);
              return (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  prefetch
                  className="group flex min-h-[44px] items-start gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-all hover:border-brand/50 hover:shadow-md sm:p-5"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand/35 to-brand/15 ring-1 ring-brand/25 transition-transform group-hover:scale-105">
                    <Icon className="h-6 w-6 text-foreground" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-semibold text-foreground">{category.name}</h2>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-brand-dark/70 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {category.description ?? `${category.serviceCount} xidmət`}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {category.serviceCount} xidmət
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default function CategoriesIndexPage() {
  return (
    <Suspense fallback={<CategoryPageSkeleton />}>
      <CategoriesIndexContent />
    </Suspense>
  );
}
