import type { MetadataRoute } from 'next';
import { isPublicComingSoonEnabled } from '@/lib/coming-soon';
import {
  buildPublicSitemap,
  buildStaticSitemap,
  SITEMAP_INVENTORY_BUDGET_MS,
  withTimeout,
} from '@/lib/sitemap-data';
import { getSiteUrl } from '@/lib/site-url';

export const revalidate = 3600;
export const runtime = 'nodejs';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  if (isPublicComingSoonEnabled()) {
    return [];
  }

  try {
    return await withTimeout(
      buildPublicSitemap(siteUrl),
      SITEMAP_INVENTORY_BUDGET_MS + 4_000,
      buildStaticSitemap(siteUrl),
    );
  } catch {
    return buildStaticSitemap(siteUrl);
  }
}
