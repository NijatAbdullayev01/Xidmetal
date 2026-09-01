import { describe, expect, it } from 'vitest';
import {
  buildServiceSlug,
  categoryLocationPath,
  categoryLocationTypePath,
  categoryTypePath,
  isUuid,
  locationLocativeAz,
  locationPublicSlug,
  providerPublicPath,
  servicePublicPath,
  slugifyAz,
} from '@xidmetal/shared';

describe('slugifyAz', () => {
  it('Azərbaycan hərflərini transliterasiya edir', () => {
    expect(slugifyAz('Bakıda təmizlik')).toBe('bakida-temizlik');
    expect(slugifyAz('Gözəllik və SPA')).toBe('gozellik-ve-spa');
  });
});

describe('buildServiceSlug', () => {
  it('title + id prefiksi birləşdirir', () => {
    expect(buildServiceSlug('Ev təmizliyi', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(
      'ev-temizliyi-a1b2c3d4',
    );
  });
});

describe('isUuid', () => {
  it('UUID və slug-ı ayırır', () => {
    expect(isUuid('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
    expect(isUuid('ev-temizliyi-a1b2c3d4')).toBe(false);
  });
});

describe('servicePublicPath', () => {
  it('slug varsa onu işlədir', () => {
    expect(servicePublicPath({ id: 'abc', slug: 'ev-temizliyi-abc' })).toBe(
      '/services/ev-temizliyi-abc',
    );
    expect(servicePublicPath({ id: 'abc' })).toBe('/services/abc');
  });
});

describe('SEO path helpers', () => {
  it('növ, məkan və xidmət verən URL-lərini qurur', () => {
    expect(categoryTypePath('temizlik', 'Ev təmizliyi')).toBe(
      '/categories/temizlik/type/ev-temizliyi',
    );
    expect(categoryLocationPath('temizlik', 'Bakı')).toBe('/categories/temizlik/in/baki');
    expect(categoryLocationTypePath('temizlik', 'Bakı', 'Ev təmizliyi')).toBe(
      '/categories/temizlik/in/baki/type/ev-temizliyi',
    );
    expect(providerPublicPath('p-1')).toBe('/providers/p-1');
    expect(locationPublicSlug('Bakı, Yasamal rayonu')).toBe('baki-yasamal-rayonu');
    expect(locationLocativeAz('Bakı')).toBe('Bakıda');
    expect(locationLocativeAz('Gəncə')).toBe('Gəncədə');
    expect(locationLocativeAz('Bakı, Nəsimi rayonu')).toBe('Bakı, Nəsimi rayonunda');
  });
});
