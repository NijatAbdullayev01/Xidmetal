import { Suspense } from 'react';
import type { Metadata } from 'next';
import type { CategorySummary, PaginatedResponse, ServiceSummary } from '@xidmetal/shared';
import { ServicesPageSkeleton } from '@/components/ui/page-skeletons';
import { api } from '@/lib/api';
import { ServicesContent } from './services-content';

export const metadata: Metadata = {
  title: 'Xidmətlər',
  description:
    'Təmizlik, təmir, gözəllik, təhsil və daha çox — Xidmətal-da minlərlə etibarlı xidməti kəşf edin, müqayisə edin və sifariş verin.',
};

const PAGE_SIZE = 24;

type SearchParams = Promise<{
  q?: string;
  page?: string;
  categoryId?: string;
}>;

async function loadServicesData(input: {
  q: string;
  page: number;
  categoryId: string | null;
}): Promise<{
  categories: CategorySummary[];
  servicesPage: PaginatedResponse<ServiceSummary>;
}> {
  try {
    const params: Record<string, string> = {
      limit: String(PAGE_SIZE),
      page: String(input.page),
    };
    if (input.q) params.search = input.q;
    if (input.categoryId) params.categoryId = input.categoryId;

    const [categories, servicesPage] = await Promise.all([
      api.categories(),
      api.services(params),
    ]);

    return { categories, servicesPage };
  } catch {
    return {
      categories: [],
      servicesPage: {
        items: [],
        total: 0,
        page: input.page,
        limit: PAGE_SIZE,
        totalPages: 0,
      },
    };
  }
}

async function ServicesPageBody({
  q,
  page,
  categoryId,
}: {
  q: string;
  page: number;
  categoryId: string | null;
}) {
  const { categories, servicesPage } = await loadServicesData({
    q,
    page,
    categoryId,
  });

  return (
    <ServicesContent
      categories={categories}
      services={servicesPage.items}
      total={servicesPage.total}
      page={servicesPage.page}
      totalPages={servicesPage.totalPages}
      query={q}
      categoryId={categoryId}
    />
  );
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const categoryId = params.categoryId?.trim() || null;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const suspenseKey = `${q}|${categoryId ?? ''}|${page}`;

  return (
    <Suspense key={suspenseKey} fallback={<ServicesPageSkeleton />}>
      <ServicesPageBody q={q} page={page} categoryId={categoryId} />
    </Suspense>
  );
}
