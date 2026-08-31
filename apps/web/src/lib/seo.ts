import type { Metadata } from 'next';
import { APP } from '@xidmetal/shared';
import { getSiteUrl } from './site-url';

/** googleBot layout-dan merge olunmasın — əks halda noindex əzilir. */
export const NOINDEX: Metadata['robots'] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: { index: false, follow: false, noimageindex: true },
};

export const NOINDEX_FOLLOW: Metadata['robots'] = {
  index: false,
  follow: true,
  googleBot: {
    index: false,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
  },
};

/** Relative path → absolute, trailing slash yox (kök də). */
export function toCanonicalUrl(path: string, siteUrl = getSiteUrl()): string {
  const origin = siteUrl.replace(/\/$/, '');
  if (/^https?:\/\//i.test(path)) {
    const url = path.replace(/\/$/, '');
    return url.length > 0 ? url : origin;
  }
  if (!path || path === '/') return origin;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Meta description — söz ortasında kəsmə. */
export function truncateMetaDescription(text: string, max = 160): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;

  const sliced = normalized.slice(0, max - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  const clipped = lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced;
  return `${clipped.trim()}…`;
}

export function pageTitle(title: string, page: number): string {
  return page > 1 ? `${title} — səhifə ${page}` : title;
}

export function parsePageParam(raw: string | undefined): number {
  return Math.max(1, Number.parseInt(raw ?? '1', 10) || 1);
}

/** Səhifə title/description-u OG və Twitter-ə köçürür — root layout kilidi olmasın. */
export function pageMetadata(input: {
  title: string;
  description: string;
  canonical: string;
  robots?: Metadata['robots'];
  absoluteTitle?: boolean;
  ogType?: 'website' | 'article';
  images?: { url: string; alt?: string }[];
  siteUrl?: string;
}): Metadata {
  const canonical = toCanonicalUrl(input.canonical, input.siteUrl);
  const ogImages = input.images?.map((image) => ({
    url: image.url,
    alt: image.alt,
  }));

  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    alternates: {
      canonical,
      languages: {
        [APP.defaultLocale]: canonical,
        'x-default': canonical,
      },
    },
    ...(input.robots ? { robots: input.robots } : {}),
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonical,
      type: input.ogType ?? 'website',
      locale: 'az_AZ',
      siteName: APP.name,
      ...(ogImages?.length ? { images: ogImages } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      ...(ogImages?.length ? { images: ogImages.map((image) => image.url) } : {}),
    },
  };
}
