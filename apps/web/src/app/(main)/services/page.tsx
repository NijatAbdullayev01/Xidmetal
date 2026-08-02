import { Suspense } from 'react';
import type { Metadata } from 'next';
import type { CategorySummary, ServiceSummary } from '@xidmetal/shared';
import { ServicesPageSkeleton } from '@/components/ui/page-skeletons';
import { api } from '@/lib/api';
import { ServicesContent } from './services-content';

/** searchParams serverdə oxunmur → səhifə ISR ola bilir; ?q= client-də filtrələnir */
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Xidmətlər | Xidmətal',
  description:
    'Təmizlik, təmir, gözəllik, təhsil və daha çox — Xidmətal-da minlərlə etibarlı xidməti kəşf edin, müqayisə edin və sifariş verin.',
};

async function loadServicesData(): Promise<{
  categories: CategorySummary[];
  services: ServiceSummary[];
}> {
  try {
    const [categories, servicesResponse] = await Promise.all([
      api.categories(),
      api.services({ limit: '100' }),
    ]);

    return {
      categories,
      services: servicesResponse.items,
    };
  } catch {
    return { categories: [], services: [] };
  }
}

export default async function ServicesPage() {
  const { categories, services } = await loadServicesData();

  return (
    <Suspense fallback={<ServicesPageSkeleton />}>
      <ServicesContent categories={categories} services={services} />
    </Suspense>
  );
}
