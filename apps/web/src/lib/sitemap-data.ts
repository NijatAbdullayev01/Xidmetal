import type { MetadataRoute } from 'next';
import { API, CLIENT_APP, CLIENT_APP_HEADER } from '@xidmetal/shared';
import type { CategorySummary, PaginatedResponse, ServiceSummary } from '@xidmetal/shared';
import {
  categoryLocationPath,
  categoryLocationTypePath,
  categoryTypePath,
  providerPublicPath,
  resolveServiceCity,
  servicePublicPath,
} from '@xidmetal/shared';
import { isCanonicalServiceType } from './service-types';
import { getServerApiBaseUrl } from './site-url';

export type SitemapPath = {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
  priority: number;
};

export const PUBLIC_SITEMAP_PATHS: SitemapPath[] = [
  { path: '', changeFrequency: 'daily', priority: 1 },
  { path: '/services', changeFrequency: 'daily', priority: 0.9 },
  { path: '/categories', changeFrequency: 'daily', priority: 0.9 },
  { path: '/about', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/how-it-works', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/faq', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/provider/guide', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/terms', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.3 },
];

const PAGE_SIZE = 100;
const MAX_PAGES = 50;
const FETCH_TIMEOUT_MS = 4_000;
const FETCH_CONCURRENCY = 4;
export const SITEMAP_INVENTORY_BUDGET_MS = 12_000;

type SitemapService = Pick<
  ServiceSummary,
  | 'id'
  | 'slug'
  | 'title'
  | 'location'
  | 'categorySlug'
  | 'providerId'
  | 'createdAt'
  | 'updatedAt'
  | 'images'
>;

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function laterDate(a?: Date, b?: Date): Date | undefined {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() >= b.getTime() ? a : b;
}

function absoluteMediaUrl(siteUrl: string, url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('https://') || url.startsWith('http://')) return url;
  if (url.startsWith('/')) return `${siteUrl}${url}`;
  return undefined;
}

export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, ms);
    promise.then(
      (value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(value);
        }
      },
      () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(fallback);
        }
      },
    );
  });
}

function sitemapEntry(
  siteUrl: string,
  path: string,
  rest: Omit<MetadataRoute.Sitemap[number], 'url' | 'alternates'>,
): MetadataRoute.Sitemap[number] {
  const url = `${siteUrl}${path}`;
  return {
    url,
    alternates: {
      languages: {
        az: url,
        'x-default': url,
      },
    },
    ...rest,
  };
}

export function buildStaticSitemap(siteUrl: string): MetadataRoute.Sitemap {
  return PUBLIC_SITEMAP_PATHS.map((entry) =>
    sitemapEntry(siteUrl, entry.path, {
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    }),
  );
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${getServerApiBaseUrl()}${API.prefix}${path}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        [CLIENT_APP_HEADER]: CLIENT_APP.MARKETPLACE,
      },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function toSitemapService(service: ServiceSummary): SitemapService | null {
  if (!service.id) return null;
  return {
    id: service.id,
    slug: service.slug,
    title: service.title,
    location: service.location,
    categorySlug: service.categorySlug,
    providerId: service.providerId,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
    images: service.images,
  };
}

async function fetchAllPublicServices(): Promise<SitemapService[]> {
  const first = await fetchJson<PaginatedResponse<ServiceSummary>>(
    `/services?limit=${PAGE_SIZE}&page=1`,
  );
  if (!first || !Array.isArray(first.items) || first.items.length === 0) {
    return [];
  }

  const collected: SitemapService[] = [];
  for (const service of first.items) {
    const mapped = toSitemapService(service);
    if (mapped) collected.push(mapped);
  }

  const totalPages = Math.min(first.totalPages || 1, MAX_PAGES);
  if (totalPages <= 1) return collected;

  const remaining = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);
  for (let offset = 0; offset < remaining.length; offset += FETCH_CONCURRENCY) {
    const batch = remaining.slice(offset, offset + FETCH_CONCURRENCY);
    const pages = await Promise.all(
      batch.map((page) =>
        fetchJson<PaginatedResponse<ServiceSummary>>(
          `/services?limit=${PAGE_SIZE}&page=${page}`,
        ),
      ),
    );
    for (const result of pages) {
      if (!result || !Array.isArray(result.items)) continue;
      for (const service of result.items) {
        const mapped = toSitemapService(service);
        if (mapped) collected.push(mapped);
      }
    }
  }

  return collected;
}

export function buildInventorySitemap(
  siteUrl: string,
  services: SitemapService[],
): MetadataRoute.Sitemap {
  const typeRoutes = new Map<string, Date | undefined>();
  const locationRoutes = new Map<string, Date | undefined>();
  const comboRoutes = new Map<string, Date | undefined>();
  const providerRoutes = new Map<string, Date | undefined>();

  const serviceRoutes: MetadataRoute.Sitemap = [];

  for (const service of services) {
    const lastModified =
      parseDate(service.updatedAt) ?? parseDate(service.createdAt);
    const image = absoluteMediaUrl(siteUrl, service.images?.[0]?.url);
    const categorySlug = service.categorySlug;
    const canonicalType = Boolean(
      categorySlug &&
        service.title &&
        isCanonicalServiceType(categorySlug, service.title),
    );

    if (canonicalType && categorySlug) {
      const typePath = categoryTypePath(categorySlug, service.title);
      typeRoutes.set(typePath, laterDate(typeRoutes.get(typePath), lastModified));
    }

    if (categorySlug && service.location) {
      const city = resolveServiceCity(service.location);
      const cityPath = categoryLocationPath(categorySlug, city);
      locationRoutes.set(cityPath, laterDate(locationRoutes.get(cityPath), lastModified));

      if (city !== service.location) {
        const districtPath = categoryLocationPath(categorySlug, service.location);
        locationRoutes.set(
          districtPath,
          laterDate(locationRoutes.get(districtPath), lastModified),
        );
      }

      if (canonicalType) {
        const comboPath = categoryLocationTypePath(categorySlug, city, service.title);
        comboRoutes.set(comboPath, laterDate(comboRoutes.get(comboPath), lastModified));
      }
    }

    if (service.providerId) {
      const providerPath = providerPublicPath(service.providerId);
      providerRoutes.set(
        providerPath,
        laterDate(providerRoutes.get(providerPath), lastModified),
      );
    }

    serviceRoutes.push(
      sitemapEntry(siteUrl, servicePublicPath(service), {
        ...(lastModified ? { lastModified } : {}),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
        ...(image ? { images: [image] } : {}),
      }),
    );
  }

  const fromMap = (
    map: Map<string, Date | undefined>,
    priority: number,
    changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>,
  ): MetadataRoute.Sitemap =>
    [...map.entries()].map(([path, lastModified]) =>
      sitemapEntry(siteUrl, path, {
        ...(lastModified ? { lastModified } : {}),
        changeFrequency,
        priority,
      }),
    );

  return [
    ...serviceRoutes,
    ...fromMap(typeRoutes, 0.75, 'weekly'),
    ...fromMap(locationRoutes, 0.75, 'weekly'),
    ...fromMap(comboRoutes, 0.7, 'weekly'),
    ...fromMap(providerRoutes, 0.55, 'weekly'),
  ];
}

export function categoryLastModifiedMap(
  services: SitemapService[],
): Map<string, Date | undefined> {
  const categoryTouched = new Map<string, Date | undefined>();
  for (const service of services) {
    if (!service.categorySlug) continue;
    const lastModified =
      parseDate(service.updatedAt) ?? parseDate(service.createdAt);
    categoryTouched.set(
      service.categorySlug,
      laterDate(categoryTouched.get(service.categorySlug), lastModified),
    );
  }
  return categoryTouched;
}

export async function buildPublicSitemap(siteUrl: string): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = buildStaticSitemap(siteUrl);

  try {
    const [categories, services] = await Promise.all([
      fetchJson<CategorySummary[]>('/categories'),
      withTimeout(fetchAllPublicServices(), SITEMAP_INVENTORY_BUDGET_MS, []),
    ]);

    const categoryDates = categoryLastModifiedMap(services);

    const categoryRoutes: MetadataRoute.Sitemap = Array.isArray(categories)
      ? categories
          .filter((category) => Boolean(category.slug))
          .map((category) => {
            const lastModified = categoryDates.get(category.slug);
            return sitemapEntry(siteUrl, `/categories/${category.slug}`, {
              ...(lastModified ? { lastModified } : {}),
              changeFrequency: 'daily' as const,
              priority: 0.8,
            });
          })
      : [];

    return [...staticRoutes, ...categoryRoutes, ...buildInventorySitemap(siteUrl, services)];
  } catch {
    return staticRoutes;
  }
}
