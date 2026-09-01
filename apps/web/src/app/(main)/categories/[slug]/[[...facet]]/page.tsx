import { Suspense, cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  categoryLocationPath,
  categoryTypePath,
  locationLocativeAz,
  type CategorySummary,
  type PaginatedResponse,
  type ServiceSummary,
} from '@xidmetal/shared';
import { CategoryPageSkeleton } from '@/components/ui/page-skeletons';
import { JsonLd } from '@/components/seo/json-ld';
import { api, ApiError } from '@/lib/api';
import {
  categoryFacetPath,
  categoryListingCopy,
  parseCategoryFacet,
  type CategoryFacet,
} from '@/lib/category-facet';
import { getServiceTypesForCategory, isCanonicalServiceType } from '@/lib/service-types';
import { NOINDEX_FOLLOW, pageMetadata, parsePageParam, truncateMetaDescription } from '@/lib/seo';
import {
  buildBreadcrumbJsonLd,
  buildCategoryItemListJsonLd,
  buildCollectionPageJsonLd,
} from '@/lib/seo-schema';
import { getSiteUrl } from '@/lib/site-url';
import { CategoryContent } from '../category-content';

export const revalidate = 60;

const PAGE_SIZE = 24;

type PageProps = {
  params: Promise<{ slug: string; facet?: string[] }>;
  searchParams: Promise<{ page?: string }>;
};

function typeTitlesFor(slug: string, extra: string[] = []): string[] {
  const predefined = getServiceTypesForCategory(slug) ?? [];
  const titles = new Set<string>(predefined);
  for (const title of extra) {
    const trimmed = title.trim();
    if (trimmed) titles.add(trimmed);
  }
  return [...titles];
}

const loadCategory = cache(async (slug: string): Promise<CategorySummary | null> => {
  try {
    return await api.category(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
});

const loadListing = cache(
  async (input: {
    slug: string;
    page: number;
    title?: string;
    location?: string;
  }): Promise<{
    category: CategorySummary;
    servicesPage: PaginatedResponse<ServiceSummary>;
  } | null> => {
    const category = await loadCategory(input.slug);
    if (!category) return null;

    try {
      const params: Record<string, string> = {
        categoryId: category.id,
        limit: String(PAGE_SIZE),
        page: String(input.page),
      };
      if (input.title) params.title = input.title;
      if (input.location) params.location = input.location;
      const servicesPage = await api.services(params);
      return { category, servicesPage };
    } catch {
      return {
        category,
        servicesPage: {
          items: [],
          total: 0,
          page: input.page,
          limit: PAGE_SIZE,
          totalPages: 0,
        },
      };
    }
  },
);

async function resolveFacet(
  slug: string,
  facetParam: string[] | undefined,
): Promise<Exclude<CategoryFacet, { kind: 'invalid' }> | 'invalid'> {
  const first = parseCategoryFacet(facetParam, typeTitlesFor(slug));
  if (first.kind !== 'invalid') return first;

  const needsTitles =
    (facetParam?.[0] === 'type' && facetParam.length === 2) ||
    (facetParam?.[0] === 'in' && facetParam?.[2] === 'type' && facetParam.length === 4);
  if (!needsTitles) return 'invalid';

  const category = await loadCategory(slug);
  if (!category) return 'invalid';
  try {
    const sample = await api.services({ categoryId: category.id, limit: '100' });
    const extra = sample.items.map((service) => service.title);
    const resolved = parseCategoryFacet(facetParam, typeTitlesFor(slug, extra));
    return resolved.kind === 'invalid' ? 'invalid' : resolved;
  } catch {
    return 'invalid';
  }
}

function listingQuery(facet: Exclude<CategoryFacet, { kind: 'invalid' }>): {
  title?: string;
  location?: string;
} {
  if (facet.kind === 'type') return { title: facet.typeTitle };
  if (facet.kind === 'location') return { location: facet.locationLabel };
  if (facet.kind === 'location-type') {
    return { title: facet.typeTitle, location: facet.locationLabel };
  }
  return {};
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug, facet: facetParam } = await params;
  const page = parsePageParam((await searchParams).page);
  const facet = await resolveFacet(slug, facetParam);
  if (facet === 'invalid') {
    return { title: 'Səhifə tapılmadı', robots: NOINDEX_FOLLOW };
  }

  const query = listingQuery(facet);
  const data = await loadListing({ slug, page, ...query });
  if (!data) {
    return { title: 'Kateqoriya tapılmadı', robots: NOINDEX_FOLLOW };
  }

  const copy = categoryListingCopy({
    categoryName: data.category.name,
    categoryDescription: data.category.description,
    typeTitle: 'typeTitle' in facet ? facet.typeTitle : undefined,
    locationLabel: 'locationLabel' in facet ? facet.locationLabel : undefined,
    locationLocative:
      'locationLabel' in facet ? locationLocativeAz(facet.locationLabel) : undefined,
  });

  const path = categoryFacetPath(slug, facet);
  const canonical = page > 1 ? `${path}?page=${page}` : path;
  const emptyFacet = facet.kind !== 'none' && data.servicesPage.total === 0;
  const customType =
    (facet.kind === 'type' || facet.kind === 'location-type') &&
    !isCanonicalServiceType(slug, facet.typeTitle);
  const outOfRange =
    page > 1 &&
    (data.servicesPage.totalPages === 0 || page > data.servicesPage.totalPages);

  return {
    ...pageMetadata({
      title: page > 1 ? `${copy.title} — səhifə ${page}` : copy.title,
      description: truncateMetaDescription(copy.description),
      canonical,
      robots: emptyFacet || outOfRange || customType ? NOINDEX_FOLLOW : undefined,
    }),
  };
}

function breadcrumbItems(
  category: CategorySummary,
  facet: Exclude<CategoryFacet, { kind: 'invalid' }>,
  copyH1: string,
) {
  const items = [
    { href: '/', label: 'Ana səhifə' },
    { href: '/categories', label: 'Kateqoriyalar' },
    {
      href: `/categories/${category.slug}`,
      label: category.name,
    },
  ];

  if (facet.kind === 'none') {
    return [...items.slice(0, 2), { label: copyH1 }];
  }
  if (facet.kind === 'type') {
    return [...items, { label: facet.typeTitle }];
  }
  if (facet.kind === 'location') {
    return [...items, { label: facet.locationLabel }];
  }
  return [
    ...items,
    {
      href: categoryLocationPath(category.slug, facet.locationLabel),
      label: facet.locationLabel,
    },
    { label: facet.typeTitle },
  ];
}

function jsonLdCrumbs(
  category: CategorySummary,
  facet: Exclude<CategoryFacet, { kind: 'invalid' }>,
  copyH1: string,
) {
  const crumbs = [
    { name: 'Ana səhifə', path: '/' },
    { name: 'Kateqoriyalar', path: '/categories' },
    { name: category.name, path: `/categories/${category.slug}` },
  ];
  if (facet.kind === 'none') {
    crumbs[2] = { name: copyH1, path: `/categories/${category.slug}` };
    return crumbs;
  }
  if (facet.kind === 'type') {
    crumbs.push({
      name: facet.typeTitle,
      path: categoryTypePath(category.slug, facet.typeTitle),
    });
  } else if (facet.kind === 'location') {
    crumbs.push({
      name: facet.locationLabel,
      path: categoryLocationPath(category.slug, facet.locationLabel),
    });
  } else if (facet.kind === 'location-type') {
    crumbs.push({
      name: facet.locationLabel,
      path: categoryLocationPath(category.slug, facet.locationLabel),
    });
    crumbs.push({
      name: facet.typeTitle,
      path: categoryFacetPath(category.slug, facet),
    });
  }
  return crumbs;
}

async function CategoryPageBody({
  slug,
  facetParam,
  page,
}: {
  slug: string;
  facetParam?: string[];
  page: number;
}) {
  const facet = await resolveFacet(slug, facetParam);
  if (facet === 'invalid') {
    notFound();
  }

  const query = listingQuery(facet);
  const data = await loadListing({ slug, page, ...query });
  if (!data) {
    notFound();
  }

  const { category, servicesPage } = data;
  const copy = categoryListingCopy({
    categoryName: category.name,
    categoryDescription: category.description,
    typeTitle: 'typeTitle' in facet ? facet.typeTitle : undefined,
    locationLabel: 'locationLabel' in facet ? facet.locationLabel : undefined,
    locationLocative:
      'locationLabel' in facet ? locationLocativeAz(facet.locationLabel) : undefined,
  });

  const siteUrl = getSiteUrl();
  const basePath = categoryFacetPath(slug, facet);

  return (
    <>
      <JsonLd
        data={[
          buildBreadcrumbJsonLd(siteUrl, jsonLdCrumbs(category, facet, copy.h1)),
          buildCollectionPageJsonLd(siteUrl, {
            name: copy.h1,
            path: basePath,
            description: copy.description,
            itemList: buildCategoryItemListJsonLd(
              siteUrl,
              category,
              servicesPage.items,
              servicesPage.total,
            ),
          }),
        ]}
      />
      <CategoryContent
        category={category}
        services={servicesPage.items}
        heading={copy.h1}
        intro={copy.intro}
        breadcrumbItems={breadcrumbItems(category, facet, copy.h1)}
        pagination={{
          page: servicesPage.page || page,
          totalPages: servicesPage.totalPages,
          basePath,
        }}
      />
    </>
  );
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug, facet } = await params;
  const page = parsePageParam((await searchParams).page);

  return (
    <Suspense fallback={<CategoryPageSkeleton />}>
      <CategoryPageBody slug={slug} facetParam={facet} page={page} />
    </Suspense>
  );
}
