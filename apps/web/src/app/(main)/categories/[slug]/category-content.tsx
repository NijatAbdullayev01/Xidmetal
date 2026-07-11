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
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
