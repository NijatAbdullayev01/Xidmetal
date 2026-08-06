import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3020';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/services',
    '/categories',
    '/how-it-works',
    '/faq',
    '/contact',
    '/terms',
    '/privacy',
    '/provider/guide',
    '/login',
    '/register',
  ].map((path) => ({
    url: `${APP_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' || path === '/services' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.7,
  }));

  try {
    const [categories, services] = await Promise.all([
      api.categories(),
      api.services({ limit: '100' }),
    ]);

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
      url: `${APP_URL}/categories/${category.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    }));

    const serviceRoutes: MetadataRoute.Sitemap = services.items.map((service) => ({
      url: `${APP_URL}/services/${service.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

    return [...staticRoutes, ...categoryRoutes, ...serviceRoutes];
  } catch {
    return staticRoutes;
  }
}
