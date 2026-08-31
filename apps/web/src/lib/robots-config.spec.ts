import { describe, expect, it } from 'vitest';
import { buildRobotsConfig } from './robots-config';

describe('buildRobotsConfig', () => {
  it('dashboard, API və auth səhifələrini bağlayır', () => {
    const robots = buildRobotsConfig('https://xidmetal.com', false);
    expect(robots.sitemap).toBe('https://xidmetal.com/sitemap.xml');
    expect(robots.host).toBe('https://xidmetal.com');
    expect(robots.rules).toMatchObject({
      allow: '/',
    });
    expect(robots.rules).toEqual(
      expect.objectContaining({
        disallow: expect.arrayContaining([
          '/dashboard',
          '/api',
          '/mail',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
          '/coming-soon',
          '/services?q=',
          '/services?categoryId=',
        ]),
      }),
    );
  });

  it('coming-soon rejimində indeksləməni və sitemap-i bağlayır', () => {
    const robots = buildRobotsConfig('https://xidmetal.com', true);
    expect(robots.sitemap).toBeUndefined();
    expect(robots.rules).toMatchObject({
      allow: ['/google3ca31a5fa705ff79.html'],
      disallow: '/',
    });
  });
});
