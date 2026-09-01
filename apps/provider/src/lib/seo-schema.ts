import { APP, ProviderAccountType, providerPublicPath, servicePublicPath } from '@xidmetal/shared';
import type { CategorySummary, ReviewSummary, ServiceSummary } from '@xidmetal/shared';
import { FAQ_ITEMS } from './faq-items';

export type JsonLd = Record<string, unknown>;

export type BreadcrumbItem = {
  name: string;
  path: string;
};

function organizationId(siteUrl: string): string {
  return `${siteUrl}/#organization`;
}

function websiteId(siteUrl: string): string {
  return `${siteUrl}/#website`;
}

function absoluteMediaUrl(siteUrl: string, url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('https://') || url.startsWith('http://')) return url;
  if (url.startsWith('/')) return `${siteUrl}${url}`;
  return undefined;
}

export function buildOrganizationJsonLd(siteUrl: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': organizationId(siteUrl),
    name: APP.name,
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${siteUrl}/icon-512.png`,
      width: 512,
      height: 512,
    },
    image: `${siteUrl}/icon-512.png`,
    email: APP.email,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: APP.email,
      availableLanguage: ['Azerbaijani'],
      areaServed: 'AZ',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Bakı',
      addressCountry: 'AZ',
    },
    areaServed: {
      '@type': 'Country',
      name: 'Azerbaijan',
    },
  };
}

export function buildWebSiteJsonLd(siteUrl: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': websiteId(siteUrl),
    name: APP.name,
    url: siteUrl,
    inLanguage: 'az',
    publisher: { '@id': organizationId(siteUrl) },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/services?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildWebPageJsonLd(
  siteUrl: string,
  input: {
    name: string;
    description: string;
    path: string;
    dateModified?: string;
  },
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: input.name,
    description: input.description,
    url: `${siteUrl}${input.path === '/' ? '' : input.path}`,
    inLanguage: 'az',
    isPartOf: { '@id': websiteId(siteUrl) },
    publisher: { '@id': organizationId(siteUrl) },
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
  };
}

export function buildFaqPageJsonLd(
  items: { question: string; answer: string }[] = FAQ_ITEMS,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function buildBreadcrumbJsonLd(
  siteUrl: string,
  items: BreadcrumbItem[],
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  };
}

export function buildCategoryItemListJsonLd(
  siteUrl: string,
  category: CategorySummary,
  services: Pick<ServiceSummary, 'id' | 'title' | 'slug'>[],
  totalItems = services.length,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${category.name} xidmətləri`,
    numberOfItems: totalItems,
    itemListElement: services.map((service, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: service.title,
      url: `${siteUrl}${servicePublicPath(service)}`,
    })),
  };
}

function providerJsonLd(service: ServiceSummary, siteUrl: string): JsonLd {
  const isCompany =
    service.providerAccountType === ProviderAccountType.COMPANY;
  const url = `${siteUrl}${providerPublicPath(service.providerId)}`;
  return {
    '@type': isCompany ? 'Organization' : 'Person',
    '@id': url,
    name: service.providerName,
    url,
  };
}

function offerJsonLd(siteUrl: string, service: ServiceSummary): JsonLd {
  const availability =
    service.providerAvailability === 'ONLINE'
      ? 'https://schema.org/InStock'
      : 'https://schema.org/LimitedAvailability';

  const offer: JsonLd = {
    '@type': 'Offer',
    url: `${siteUrl}${servicePublicPath(service)}`,
    priceCurrency: 'AZN',
    availability,
  };

  if (service.price > 0) {
    offer.price = service.price;
  } else {
    offer.description = 'Qiymət razılaşma ilə';
  }

  return offer;
}

export function buildReviewJsonLd(reviews: ReviewSummary[]): JsonLd[] {
  return reviews
    .filter((review) => review.rating > 0)
    .map((review) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: review.authorName },
      datePublished: review.createdAt,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
      ...(review.comment ? { reviewBody: review.comment } : {}),
      name: review.serviceTitle,
    }));
}

export function buildServiceJsonLd(
  siteUrl: string,
  service: ServiceSummary,
  reviews: ReviewSummary[] = [],
): JsonLd {
  const jsonLd: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.title,
    description: service.description,
    url: `${siteUrl}${servicePublicPath(service)}`,
    inLanguage: 'az',
    mainEntityOfPage: `${siteUrl}${servicePublicPath(service)}`,
    provider: providerJsonLd(service, siteUrl),
    areaServed: service.location || 'Azərbaycan',
    category: service.categoryName || undefined,
    serviceType: service.categoryName || undefined,
    offers: offerJsonLd(siteUrl, service),
    ...(service.createdAt ? { datePublished: service.createdAt } : {}),
    ...(service.updatedAt ? { dateModified: service.updatedAt } : {}),
  };

  const imageUrl = absoluteMediaUrl(siteUrl, service.images?.[0]?.url);
  if (imageUrl) {
    jsonLd.image = {
      '@type': 'ImageObject',
      url: imageUrl,
      caption: service.images?.[0]?.alt ?? service.title,
    };
  }

  if (service.reviewCount > 0 && service.averageRating > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(service.averageRating.toFixed(1)),
      reviewCount: service.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  const reviewLd = buildReviewJsonLd(reviews);
  if (reviewLd.length > 0) {
    jsonLd.review = reviewLd;
  }

  return jsonLd;
}

export function buildHowToJsonLd(
  siteUrl: string,
  input: {
    name: string;
    description: string;
    path: string;
    steps: { name: string; text: string }[];
  },
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: input.name,
    description: input.description,
    url: `${siteUrl}${input.path}`,
    inLanguage: 'az',
    step: input.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

export function buildContactPageJsonLd(siteUrl: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Əlaqə',
    url: `${siteUrl}/contact`,
    inLanguage: 'az',
    mainEntity: {
      '@type': 'Organization',
      name: APP.name,
      email: APP.email,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Bakı',
        addressCountry: 'AZ',
      },
    },
  };
}

export function buildAboutPageJsonLd(siteUrl: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: `${APP.name} haqqında`,
    url: `${siteUrl}/about`,
    inLanguage: 'az',
    description: APP.description,
  };
}

export function buildCategoriesItemListJsonLd(
  siteUrl: string,
  categories: Pick<CategorySummary, 'name' | 'slug'>[],
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Xidmət kateqoriyaları',
    numberOfItems: categories.length,
    itemListElement: categories.map((category, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: category.name,
      url: `${siteUrl}/categories/${category.slug}`,
    })),
  };
}

export function buildServicesItemListJsonLd(
  siteUrl: string,
  services: Pick<ServiceSummary, 'id' | 'title' | 'slug'>[],
  totalItems = services.length,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Xidmətlər',
    numberOfItems: totalItems,
    itemListElement: services.map((service, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: service.title,
      url: `${siteUrl}${servicePublicPath(service)}`,
    })),
  };
}

export function buildProviderJsonLd(
  siteUrl: string,
  provider: {
    id: string;
    displayName: string;
    accountType: string;
    bio?: string;
    location?: string;
    rating: number;
    reviewCount: number;
    avatarUrl?: string;
  },
): JsonLd {
  const isCompany = provider.accountType === ProviderAccountType.COMPANY;
  const url = `${siteUrl}${providerPublicPath(provider.id)}`;
  const image = absoluteMediaUrl(siteUrl, provider.avatarUrl);
  const jsonLd: JsonLd = {
    '@context': 'https://schema.org',
    '@type': isCompany ? 'LocalBusiness' : 'Person',
    '@id': url,
    name: provider.displayName,
    url,
    ...(provider.bio ? { description: provider.bio } : {}),
    ...(provider.location
      ? {
          address: {
            '@type': 'PostalAddress',
            addressLocality: provider.location,
            addressCountry: 'AZ',
          },
        }
      : {}),
    ...(image ? { image } : {}),
  };

  if (provider.reviewCount > 0 && provider.rating > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(provider.rating.toFixed(1)),
      reviewCount: provider.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return jsonLd;
}

export function buildCollectionPageJsonLd(
  siteUrl: string,
  input: {
    name: string;
    path: string;
    description?: string;
    itemList: JsonLd;
  },
): JsonLd {
  const itemList = { ...input.itemList };
  delete itemList['@context'];

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.name,
    url: `${siteUrl}${input.path}`,
    inLanguage: 'az',
    isPartOf: { '@id': websiteId(siteUrl) },
    ...(input.description ? { description: input.description } : {}),
    mainEntity: itemList,
  };
}
