import { cache, Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  providerPublicPath,
  toDisplayMediaUrl,
  type PublicProviderProfile,
  type ReviewSummary,
  type ServiceSummary,
} from '@xidmetal/shared';
import { MapPin, Briefcase } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { JsonLd } from '@/components/seo/json-ld';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { ServiceCard } from '@/components/services/service-card';
import { ReviewListItem } from '@/components/reviews/review-list-item';
import { ReviewStars } from '@/components/reviews/review-stars';
import { NOINDEX_FOLLOW, pageMetadata, truncateMetaDescription } from '@/lib/seo';
import { buildBreadcrumbJsonLd, buildProviderJsonLd, buildServicesItemListJsonLd } from '@/lib/seo-schema';
import { getSiteUrl } from '@/lib/site-url';

export const revalidate = 60;

type PageProps = {
  params: Promise<{ id: string }>;
};

const loadProvider = cache(async (id: string): Promise<PublicProviderProfile | null> => {
  try {
    return await api.publicProvider(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    return null;
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const provider = await loadProvider(id);
  if (!provider) {
    return { title: 'Xidmət verən tapılmadı', robots: NOINDEX_FOLLOW };
  }

  const description = truncateMetaDescription(
    provider.bio ||
      `${provider.displayName} — Xidmətal-da xidmət verən${provider.location ? `, ${provider.location}` : ''}.`,
  );

  return pageMetadata({
    title: `${provider.displayName} — xidmət verən`,
    description,
    canonical: providerPublicPath(provider.id),
    images: provider.avatarUrl
      ? [{ url: provider.avatarUrl, alt: provider.displayName }]
      : undefined,
  });
}

async function ProviderPageBody({ id }: { id: string }) {
  const provider = await loadProvider(id);
  if (!provider) notFound();

  let services: ServiceSummary[] = [];
  let reviews: ReviewSummary[] = [];
  try {
    const [servicesPage, reviewsPage] = await Promise.all([
      api.services({ providerId: provider.id, limit: '24' }),
      api.reviewsByProvider(provider.id, { limit: '10' }),
    ]);
    services = servicesPage.items;
    reviews = reviewsPage.items;
  } catch {
    // profil açıq qalsın
  }

  const siteUrl = getSiteUrl();
  const path = providerPublicPath(provider.id);

  return (
    <>
      <JsonLd
        data={[
          buildBreadcrumbJsonLd(siteUrl, [
            { name: 'Ana səhifə', path: '/' },
            { name: provider.displayName, path },
          ]),
          buildProviderJsonLd(siteUrl, provider),
          ...(services.length > 0 ? [buildServicesItemListJsonLd(siteUrl, services)] : []),
        ]}
      />
      <article className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Breadcrumbs
          items={[
            { href: '/', label: 'Ana səhifə' },
            { label: provider.displayName },
          ]}
        />

        <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          {provider.avatarUrl ? (
            <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
              <Image
                src={toDisplayMediaUrl(provider.avatarUrl)}
                alt={`${provider.displayName} profil şəkli`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </span>
          ) : (
            <div
              className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand/20 text-xl font-bold"
              aria-hidden
            >
              {provider.displayName.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {provider.displayName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Xidmət verən</p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {provider.location ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" aria-hidden />
                  {provider.location}
                </span>
              ) : null}
              {provider.experience ? (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4" aria-hidden />
                  {provider.experience} il təcrübə
                </span>
              ) : null}
              {provider.reviewCount > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <ReviewStars rating={Math.round(provider.rating)} size="sm" />
                  {provider.rating.toFixed(1)} · {provider.reviewCount} rəy
                </span>
              ) : null}
            </div>
            {provider.bio ? (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {provider.bio}
              </p>
            ) : null}
          </div>
        </header>

        {services.length > 0 ? (
          <section className="mt-10" aria-labelledby="provider-services-heading">
            <h2 id="provider-services-heading" className="text-lg font-semibold">
              Xidmətlər
            </h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  categorySlug={service.categorySlug}
                />
              ))}
            </div>
          </section>
        ) : (
          <p className="mt-10 text-sm text-muted-foreground">
            Hal-hazırda aktiv xidmət elanı yoxdur.
          </p>
        )}

        {reviews.length > 0 ? (
          <section className="mt-10 border-t border-border/60 pt-8" aria-labelledby="provider-reviews-heading">
            <h2 id="provider-reviews-heading" className="text-lg font-semibold">
              Rəylər
            </h2>
            <ul className="mt-2 divide-y divide-border">
              {reviews.map((review) => (
                <ReviewListItem key={review.id} review={review} />
              ))}
            </ul>
            <p className="mt-4 text-sm">
              <Link
                href="/services"
                className="font-medium text-brand-dark underline-offset-2 hover:underline"
              >
                Bütün xidmətlərə bax
              </Link>
            </p>
          </section>
        ) : null}
      </article>
    </>
  );
}

export default async function ProviderPublicPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-16 text-sm text-muted-foreground">
          Yüklənir…
        </div>
      }
    >
      <ProviderPageBody id={id} />
    </Suspense>
  );
}
