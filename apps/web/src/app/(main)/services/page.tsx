import { cache, Suspense } from 'react';
import type { Metadata } from 'next';
import type { CategorySummary, PaginatedResponse, ServiceSummary } from '@xidmetal/shared';
import { ServicesPageSkeleton } from '@/components/ui/page-skeletons';
import { JsonLd } from '@/components/seo/json-ld';
import { api } from '@/lib/api';
import { NOINDEX_FOLLOW, pageMetadata, pageTitle } from '@/lib/seo';
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildServicesItemListJsonLd,
} from '@/lib/seo-schema';
import { getSiteUrl } from '@/lib/site-url';
import { ServicesContent } from './services-content';

export const revalidate = 60;

const PAGE_SIZE = 24;

const BASE_DESCRIPTION =
  'Təmizlik, təmir, gözəllik, təhsil və daha çox — Xidmətal-da etibarlı xidmət verənləri kəşf edin, müqayisə edin və sifariş verin.';

type SearchParams = Promise<{
  q?: string;
  page?: string;
  categoryId?: string;
}>;

function parsePage(raw: string | undefined): number {
  return Math.max(1, Number.parseInt(raw ?? '1', 10) || 1);
}

const loadServicesData = cache(async (input: {
  q: string;
  page: number;
  categoryId: string | null;
}): Promise<{
  categories: CategorySummary[];
  servicesPage: PaginatedResponse<ServiceSummary>;
}> => {
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
});

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const categoryId = params.categoryId?.trim() || null;
  const page = parsePage(params.page);

  if (q) {
    return pageMetadata({
      title: pageTitle(`Axtarış: ${q}`, page),
      description: `«${q}» üzrə xidmət nəticələri — Xidmətal.`,
      canonical: `/services?q=${encodeURIComponent(q)}${page > 1 ? `&page=${page}` : ''}`,
      robots: NOINDEX_FOLLOW,
    });
  }

  if (categoryId) {
    return pageMetadata({
      title: 'Xidmətlər',
      description: BASE_DESCRIPTION,
      canonical: '/services',
      robots: NOINDEX_FOLLOW,
    });
  }

  const canonical = page > 1 ? `/services?page=${page}` : '/services';
  const { servicesPage } = await loadServicesData({ q: '', page, categoryId: null });
  const outOfRange =
    page > 1 && (servicesPage.totalPages === 0 || page > servicesPage.totalPages);

  return pageMetadata({
    title: pageTitle('Xidmətlər', page),
    description: BASE_DESCRIPTION,
    canonical,
    robots: outOfRange ? NOINDEX_FOLLOW : undefined,
  });
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const categoryId = params.categoryId?.trim() || null;
  const page = parsePage(params.page);

  const { categories, servicesPage } = await loadServicesData({
    q,
    page,
    categoryId,
  });

  return (
    <Suspense fallback={<ServicesPageSkeleton />}>
      <>
        <JsonLd
          data={[
            buildBreadcrumbJsonLd(getSiteUrl(), [
              { name: 'Ana səhifə', path: '/' },
              { name: 'Xidmətlər', path: '/services' },
            ]),
            buildCollectionPageJsonLd(getSiteUrl(), {
              name: 'Xidmətlər',
              path: '/services',
              description: BASE_DESCRIPTION,
              itemList: buildServicesItemListJsonLd(
                getSiteUrl(),
                servicesPage.items,
                servicesPage.total,
              ),
            }),
          ]}
        />
        <ServicesContent
          categories={categories}
          services={servicesPage.items}
          total={servicesPage.total}
          page={servicesPage.page}
          totalPages={servicesPage.totalPages}
          query={q}
          categoryId={categoryId}
        />
      </>
    </Suspense>
  );
}
