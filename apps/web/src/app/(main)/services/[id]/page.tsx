import { cache, Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  servicePublicPath,
  type ReviewSummary,
  type ServiceSummary,
} from '@xidmetal/shared';
import { api } from '@/lib/api';
import { ServiceDetailView } from '@/components/services/service-detail-view';
import { ServiceDetailSkeleton } from '@/components/ui/page-skeletons';
import { JsonLd } from '@/components/seo/json-ld';
import { NOINDEX_FOLLOW, pageMetadata, truncateMetaDescription } from '@/lib/seo';
import {
  buildBreadcrumbJsonLd,
  buildCategoryItemListJsonLd,
  buildServiceJsonLd,
} from '@/lib/seo-schema';
import { getSiteUrl } from '@/lib/site-url';

export const revalidate = 60;

type PageProps = {
  params: Promise<{ id: string }>;
};

const loadService = cache(async (id: string): Promise<ServiceSummary | null> => {
  try {
    return await api.service(id);
  } catch {
    return null;
  }
});

export async function generateStaticParams() {
  try {
    const pages = await Promise.all(
      ['1', '2', '3'].map((page) =>
        api.services({ limit: '100', page }).catch(() => ({ items: [] as ServiceSummary[] })),
      ),
    );
    const seen = new Set<string>();
    const params: { id: string }[] = [];
    for (const page of pages) {
      for (const service of page.items) {
        const id = service.slug || service.id;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        params.push({ id });
      }
    }
    return params;
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const service = await loadService(id);
  if (!service) {
    return { title: 'Xidmət tapılmadı', robots: NOINDEX_FOLLOW };
  }

  const description = truncateMetaDescription(
    service.description ||
      `${service.title} — ${service.categoryName}${service.location ? `, ${service.location}` : ''} | Xidmətal`,
  );
  const canonical = servicePublicPath(service);
  const title = service.location
    ? `${service.title} — ${service.location}`
    : service.categoryName
      ? `${service.title} — ${service.categoryName}`
      : service.title;

  const image = service.images?.[0];

  return pageMetadata({
    title,
    description,
    canonical,
    images: image?.url
      ? [{ url: image.url, alt: image.alt ?? service.title }]
      : undefined,
  });
}

async function loadRelated(service: ServiceSummary): Promise<ServiceSummary[]> {
  if (!service.categoryId) return [];
  try {
    const page = await api.services({
      categoryId: service.categoryId,
      limit: '8',
    });
    return page.items.filter((item) => item.id !== service.id).slice(0, 6);
  } catch {
    return [];
  }
}

async function loadReviews(service: ServiceSummary): Promise<ReviewSummary[]> {
  try {
    const page = await api.reviewsByProvider(service.providerId, {
      serviceId: service.id,
      limit: '8',
    });
    return page.items;
  } catch {
    return [];
  }
}

async function ServiceDetailBody({ id }: { id: string }) {
  const service = await loadService(id);
  if (!service) {
    notFound();
  }

  const [related, reviews] = await Promise.all([
    loadRelated(service),
    loadReviews(service),
  ]);

  const siteUrl = getSiteUrl();
  const categoryPath = service.categorySlug
    ? `/categories/${service.categorySlug}`
    : '/categories';
  const servicePath = servicePublicPath(service);

  return (
    <>
      <JsonLd
        data={[
          buildBreadcrumbJsonLd(siteUrl, [
            { name: 'Ana səhifə', path: '/' },
            { name: 'Kateqoriyalar', path: '/categories' },
            { name: service.categoryName || 'Kateqoriya', path: categoryPath },
            { name: service.title, path: servicePath },
          ]),
          buildServiceJsonLd(siteUrl, service, reviews),
          ...(related.length > 0 && service.categoryName
            ? [
                buildCategoryItemListJsonLd(
                  siteUrl,
                  {
                    id: service.categoryId,
                    name: service.categoryName,
                    slug: service.categorySlug || '',
                    serviceCount: related.length,
                  },
                  related,
                ),
              ]
            : []),
        ]}
      />
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <ServiceDetailView service={service} reviews={reviews} related={related} />
      </div>
    </>
  );
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <ServiceDetailBody id={id} />
    </Suspense>
  );
}
