import { describe, expect, it } from 'vitest';
import { buildInventorySitemap, buildStaticSitemap, PUBLIC_SITEMAP_PATHS, withTimeout } from './sitemap-data';

describe('PUBLIC_SITEMAP_PATHS', () => {
  it('auth səhifələrini daxil etmir, about və kateqoriyaları daxil edir', () => {
    const paths = PUBLIC_SITEMAP_PATHS.map((entry) => entry.path);
    expect(paths).toContain('');
    expect(paths).toContain('/about');
    expect(paths).toContain('/categories');
    expect(paths).not.toContain('/login');
    expect(paths).not.toContain('/register');
  });
});

describe('buildStaticSitemap', () => {
  it('absolute URL və prioritet qaytarır', () => {
    const routes = buildStaticSitemap('https://xidmetal.com');
    expect(routes[0]).toMatchObject({
      url: 'https://xidmetal.com',
      priority: 1,
    });
    expect(routes[0]?.alternates?.languages).toMatchObject({
      az: 'https://xidmetal.com',
      'x-default': 'https://xidmetal.com',
    });
    expect(routes.some((route) => route.url === 'https://xidmetal.com/faq')).toBe(true);
  });
});

describe('buildInventorySitemap', () => {
  it('xidmət, kataloq növü, şəhər və xidmət verən URL-lərini inventory-dən qurur', () => {
    const routes = buildInventorySitemap('https://xidmetal.com', [
      {
        id: 'svc-1',
        slug: 'ev-ve-ofis-temizliyi-svc1',
        title: 'Ev və ofis təmizliyi',
        location: 'Bakı',
        categorySlug: 'temizlik',
        providerId: 'p-1',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-20T00:00:00.000Z',
        images: [{ id: 'img-1', url: '/uploads/a.jpg', alt: '', sortOrder: 0 }],
      },
    ]);

    const urls = routes.map((route) => route.url);
    expect(urls).toContain('https://xidmetal.com/services/ev-ve-ofis-temizliyi-svc1');
    expect(urls).toContain(
      'https://xidmetal.com/categories/temizlik/type/ev-ve-ofis-temizliyi',
    );
    expect(urls).toContain('https://xidmetal.com/categories/temizlik/in/baki');
    expect(urls).toContain(
      'https://xidmetal.com/categories/temizlik/in/baki/type/ev-ve-ofis-temizliyi',
    );
    expect(urls).toContain('https://xidmetal.com/providers/p-1');

    const service = routes.find((route) =>
      route.url.endsWith('/ev-ve-ofis-temizliyi-svc1'),
    );
    expect(service?.lastModified).toEqual(new Date('2026-08-20T00:00:00.000Z'));
    expect(service?.images).toEqual(['https://xidmetal.com/uploads/a.jpg']);
  });

  it('unikal elan başlığından növ səhifəsi yaratmır', () => {
    const routes = buildInventorySitemap('https://xidmetal.com', [
      {
        id: 'svc-2',
        slug: '3-otaqli-svc2',
        title: '3 otaqlı mənzil təmizliyi',
        location: 'Bakı',
        categorySlug: 'temizlik',
        providerId: 'p-2',
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    ]);
    const urls = routes.map((route) => route.url);
    expect(urls).toContain('https://xidmetal.com/services/3-otaqli-svc2');
    expect(urls).toContain('https://xidmetal.com/categories/temizlik/in/baki');
    expect(urls.some((url) => url.includes('/type/'))).toBe(false);
  });

  it('boş inventory-dən landing istehsal etmir', () => {
    expect(buildInventorySitemap('https://xidmetal.com', [])).toEqual([]);
  });
});

describe('withTimeout', () => {
  it('vaxt bitəndə fallback qaytarır', async () => {
    const result = await withTimeout(
      new Promise<string>(() => undefined),
      20,
      'fallback',
    );
    expect(result).toBe('fallback');
  });
});
