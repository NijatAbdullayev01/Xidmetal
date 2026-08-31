import type { MetadataRoute } from 'next';

/** Prefix match — `/dashboard/` `/dashboard` səhifəsini bağlamır. */
const AUTH_AND_PRIVATE = [
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
];

export function buildRobotsConfig(
  siteUrl: string,
  comingSoon: boolean,
): MetadataRoute.Robots {
  if (comingSoon) {
    return {
      rules: {
        userAgent: '*',
        allow: ['/google3ca31a5fa705ff79.html'],
        disallow: '/',
      },
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: AUTH_AND_PRIVATE,
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
