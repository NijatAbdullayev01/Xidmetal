'use client';

import type { CategorySummary, ServiceSummary } from '@xidmetal/shared';
import { ServiceCard } from '@/components/services/service-card';

interface CategoryContentProps {
  category: CategorySummary;
  services: ServiceSummary[];
}

export function CategoryContent({ category, services }: CategoryContentProps) {
  return (
    <section className="py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-10">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{category.name}</h1>
          {category.description ? (
            <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>
          ) : null}
        </div>

        {services.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            Bu kateqoriyada hələ aktiv xidmət yoxdur.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => (
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
    </section>
  );
}
