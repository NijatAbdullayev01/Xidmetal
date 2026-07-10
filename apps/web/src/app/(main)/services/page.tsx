import type { Metadata } from 'next';
import type { CategorySummary, ServiceSummary } from '@xidmetal/shared';
import { api } from '@/lib/api';
import { ServicesContent } from './services-content';

export const metadata: Metadata = {
  title: 'Xidmətlər | Xidmetal',
  description:
    'Təmizlik, təmir, gözəllik, təhsil və daha çox — Xidmetal-da minlərlə etibarlı xidməti kəşf edin, müqayisə edin və sifariş verin.',
};

async function loadServicesData(): Promise<{
  categories: CategorySummary[];
  services: ServiceSummary[];
}> {
  try {
    const [categories, servicesResponse] = await Promise.all([
      api.categories(),
      api.services({ limit: '50' }),
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

  return <ServicesContent categories={categories} services={services} />;
}
