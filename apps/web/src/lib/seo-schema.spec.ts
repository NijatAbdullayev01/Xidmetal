import { describe, expect, it } from 'vitest';
import { ProviderAccountType, ProviderAvailability, ServiceStatus } from '@xidmetal/shared';
import type { ServiceSummary } from '@xidmetal/shared';
import {
  buildAboutPageJsonLd,
  buildBreadcrumbJsonLd,
  buildCategoriesItemListJsonLd,
  buildCollectionPageJsonLd,
  buildContactPageJsonLd,
  buildFaqPageJsonLd,
  buildHowToJsonLd,
  buildOrganizationJsonLd,
  buildProviderJsonLd,
  buildServiceJsonLd,
  buildServicesItemListJsonLd,
  buildWebSiteJsonLd,
} from './seo-schema';

const sampleService: ServiceSummary = {
  id: 'svc-1',
  title: 'Ev təmizliyi',
  description: 'Dərin ev təmizliyi',
  price: 40,
  priceUnit: 'FIXED',
  categoryId: 'cat-1',
  categoryName: 'Təmizlik',
  categorySlug: 'temizlik',
  slug: 'ev-temizliyi-svc1',
  providerId: 'p-1',
  providerName: 'Aysel M.',
  averageRating: 4.8,
  reviewCount: 12,
  status: ServiceStatus.ACTIVE,
  isRemote: false,
  createdAt: '2026-08-01T00:00:00.000Z',
  images: [{ id: 'img-1', url: '/uploads/cover.jpg', alt: 'Ev təmizliyi', sortOrder: 0 }],
};

describe('seo-schema', () => {
  it('WebSite SearchAction sitelinks axtarışı üçün reklam edir', () => {
    const jsonLd = buildWebSiteJsonLd('https://xidmetal.com');
    expect(jsonLd['@type']).toBe('WebSite');
    expect(jsonLd['@id']).toBe('https://xidmetal.com/#website');
    expect(jsonLd.potentialAction).toMatchObject({
      '@type': 'SearchAction',
      target: {
        urlTemplate: 'https://xidmetal.com/services?q={search_term_string}',
      },
    });
  });

  it('FAQPage sual sayını saxlayır', () => {
    const jsonLd = buildFaqPageJsonLd();
    const entities = jsonLd.mainEntity as unknown[];
    expect(entities.length).toBeGreaterThan(3);
  });

  it('xidmət Offer və AggregateRating əlavə edir', () => {
    const jsonLd = buildServiceJsonLd('https://xidmetal.com', sampleService);
    expect(jsonLd['@type']).toBe('Service');
    expect(jsonLd.url).toBe('https://xidmetal.com/services/ev-temizliyi-svc1');
    expect(jsonLd.offers).toMatchObject({
      price: 40,
      priceCurrency: 'AZN',
      url: 'https://xidmetal.com/services/ev-temizliyi-svc1',
      availability: 'https://schema.org/LimitedAvailability',
    });
    expect(jsonLd.aggregateRating).toMatchObject({ reviewCount: 12 });
    expect(jsonLd.image).toMatchObject({
      '@type': 'ImageObject',
      url: 'https://xidmetal.com/uploads/cover.jpg',
    });
    expect(jsonLd.imageObject).toBeUndefined();
    expect(jsonLd.provider).toMatchObject({
      '@type': 'Person',
      url: 'https://xidmetal.com/providers/p-1',
    });
    expect(jsonLd.datePublished).toBe('2026-08-01T00:00:00.000Z');
  });

  it('onlayn xidmət verən üçün InStock, şirkət üçün Organization yazır', () => {
    const jsonLd = buildServiceJsonLd('https://xidmetal.com', {
      ...sampleService,
      providerAvailability: ProviderAvailability.ONLINE,
      providerAccountType: ProviderAccountType.COMPANY,
    });
    expect(jsonLd.offers).toMatchObject({
      availability: 'https://schema.org/InStock',
    });
    expect(jsonLd.provider).toMatchObject({ '@type': 'Organization' });
  });

  it('qiymətsiz elanda Offer price qoymur', () => {
    const jsonLd = buildServiceJsonLd('https://xidmetal.com', {
      ...sampleService,
      price: 0,
    });
    const offer = jsonLd.offers as { price?: number; description?: string };
    expect(offer.price).toBeUndefined();
    expect(offer.description).toBe('Qiymət razılaşma ilə');
  });

  it('breadcrumb mütləq URL-lər qaytarır', () => {
    const jsonLd = buildBreadcrumbJsonLd('https://xidmetal.com', [
      { name: 'Ana səhifə', path: '/' },
      { name: 'Təmizlik', path: '/categories/temizlik' },
    ]);
    const items = jsonLd.itemListElement as Array<{ item: string; position: number }>;
    expect(items[1]).toMatchObject({
      position: 2,
      item: 'https://xidmetal.com/categories/temizlik',
    });
  });

  it('Organization telefon uydurmur, e-poçt göstərir', () => {
    const jsonLd = buildOrganizationJsonLd('https://xidmetal.com');
    expect(jsonLd['@type']).toBe('Organization');
    expect(jsonLd['@id']).toBe('https://xidmetal.com/#organization');
    expect(jsonLd.email).toBe('info@xidmetal.com');
    expect(jsonLd.telephone).toBeUndefined();
    expect(jsonLd.logo).toMatchObject({
      '@type': 'ImageObject',
      url: 'https://xidmetal.com/icon-512.png',
      width: 512,
      height: 512,
    });
    expect(jsonLd.contactPoint).toMatchObject({
      '@type': 'ContactPoint',
      areaServed: 'AZ',
      email: 'info@xidmetal.com',
    });
  });

  it('HowTo addımlarını nömrələyir', () => {
    const jsonLd = buildHowToJsonLd('https://xidmetal.com', {
      name: 'Sifariş',
      description: 'Addımlar',
      path: '/how-it-works',
      steps: [
        { name: 'Tapın', text: 'Axtarış edin' },
        { name: 'Sifariş', text: 'Göndərin' },
      ],
    });
    expect(jsonLd['@type']).toBe('HowTo');
    expect(jsonLd.url).toBe('https://xidmetal.com/how-it-works');
    const steps = jsonLd.step as Array<{ position: number; name: string }>;
    expect(steps).toHaveLength(2);
    expect(steps[1]).toMatchObject({ position: 2, name: 'Sifariş' });
  });

  it('ContactPage və AboutPage URL-lərini qurur', () => {
    expect(buildContactPageJsonLd('https://xidmetal.com')).toMatchObject({
      '@type': 'ContactPage',
      url: 'https://xidmetal.com/contact',
    });
    expect(buildAboutPageJsonLd('https://xidmetal.com')).toMatchObject({
      '@type': 'AboutPage',
      url: 'https://xidmetal.com/about',
    });
  });

  it('kateqoriya siyahısı slug URL-i istifadə edir', () => {
    const jsonLd = buildCategoriesItemListJsonLd('https://xidmetal.com', [
      { name: 'Təmizlik', slug: 'temizlik' },
    ]);
    const items = jsonLd.itemListElement as Array<{ url: string }>;
    expect(items[0]?.url).toBe('https://xidmetal.com/categories/temizlik');
  });

  it('CollectionPage ItemList-i mainEntity kimi sarır', () => {
    const jsonLd = buildCollectionPageJsonLd('https://xidmetal.com', {
      name: 'Xidmətlər',
      path: '/services',
      itemList: buildServicesItemListJsonLd('https://xidmetal.com', [sampleService]),
    });
    expect(jsonLd['@type']).toBe('CollectionPage');
    expect(jsonLd.url).toBe('https://xidmetal.com/services');
    const main = jsonLd.mainEntity as { '@type': string; numberOfItems: number };
    expect(main['@type']).toBe('ItemList');
    expect(main.numberOfItems).toBe(1);
  });

  it('xidmət verən profilini Person və ya LocalBusiness kimi işarələyir', () => {
    const person = buildProviderJsonLd('https://xidmetal.com', {
      id: 'p-1',
      displayName: 'Aysel M.',
      accountType: ProviderAccountType.INDIVIDUAL,
      rating: 4.8,
      reviewCount: 12,
    });
    expect(person['@type']).toBe('Person');
    expect(person.url).toBe('https://xidmetal.com/providers/p-1');

    const company = buildProviderJsonLd('https://xidmetal.com', {
      id: 'p-2',
      displayName: 'Təmiz Ev MMC',
      accountType: ProviderAccountType.COMPANY,
      rating: 0,
      reviewCount: 0,
    });
    expect(company['@type']).toBe('LocalBusiness');
  });
});
