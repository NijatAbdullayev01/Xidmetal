'use client';

import {
  Briefcase,
  MapPin,
  Route,
  Ruler,
  Store,
  Home,
  Wifi,
} from 'lucide-react';
import Link from 'next/link';
import type { ReviewSummary, ServiceSummary } from '@xidmetal/shared';
import {
  formatVehicleDimensions,
  formatCargoRouteScope,
  formatServiceVenue,
  providerPublicPath,
  ServiceVenue,
} from '@xidmetal/shared';
import { formatPrice } from '@/lib/utils';
import { getPriceUnitLabel } from '@/lib/provider-labels';
import { ServiceImageGallery } from '@/components/services/service-image-gallery';
import { ServiceOrderButton } from '@/components/services/service-order-button';
import { ServiceCard } from '@/components/services/service-card';
import { ProviderReviewsTrigger } from '@/components/reviews/provider-reviews-trigger';
import { ReviewListItem } from '@/components/reviews/review-list-item';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';

interface ServiceDetailViewProps {
  service: ServiceSummary;
  reviews?: ReviewSummary[];
  related?: ServiceSummary[];
}

export function ServiceDetailView({
  service,
  reviews = [],
  related = [],
}: ServiceDetailViewProps) {
  const images = service.images ?? [];
  const hasImages = images.length > 0;
  const vehicleDimensions = formatVehicleDimensions(
    service.vehicleLength,
    service.vehicleWidth,
    service.vehicleHeight,
  );
  const cargoRouteLabel = formatCargoRouteScope(service.cargoRouteScope);
  const venueLabel = formatServiceVenue(service.serviceVenue);
  const VenueIcon =
    service.serviceVenue === ServiceVenue.AT_SALON ? Store : Home;
  const hasExperience =
    service.providerExperience != null && service.providerExperience > 0;

  return (
    <article className="space-y-8">
      <Breadcrumbs
        items={[
          { href: '/', label: 'Ana səhifə' },
          { href: '/categories', label: 'Kateqoriyalar' },
          {
            href: service.categorySlug
              ? `/categories/${service.categorySlug}`
              : '/categories',
            label: service.categoryName || 'Kateqoriya',
          },
          { label: service.title },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
        <div className="space-y-6">
          {hasImages ? (
            <ServiceImageGallery images={images} title={service.title} />
          ) : (
            <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-muted ring-1 ring-border/70">
              <p className="text-sm text-muted-foreground">Şəkil yoxdur</p>
            </div>
          )}

          {service.description ? (
            <section>
              <h2 className="text-sm font-semibold text-foreground">Təsvir</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {service.description}
              </p>
            </section>
          ) : null}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {service.title}
            </h1>
            <p className="mt-3">
              {service.price > 0 ? (
                <>
                  <span className="text-2xl font-bold tabular-nums text-foreground">
                    {formatPrice(service.price)}
                  </span>
                  <span className="ml-1 text-sm text-muted-foreground">
                    / {getPriceUnitLabel(service.priceUnit)}
                  </span>
                </>
              ) : (
                <span className="text-lg font-semibold text-foreground">
                  {formatPrice(service.price)}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {service.location ? (
              <MetaChip icon={MapPin}>{service.location}</MetaChip>
            ) : null}
            {venueLabel ? <MetaChip icon={VenueIcon}>{venueLabel}</MetaChip> : null}
            {service.isRemote ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-brand/10 px-2 py-1 text-xs font-medium text-foreground ring-1 ring-brand/20">
                <Wifi className="h-3 w-3 text-brand-dark" aria-hidden />
                Onlayn
              </span>
            ) : null}
            {cargoRouteLabel ? (
              <MetaChip icon={Route}>{cargoRouteLabel}</MetaChip>
            ) : null}
            {vehicleDimensions ? (
              <MetaChip icon={Ruler}>{vehicleDimensions}</MetaChip>
            ) : null}
            {hasExperience ? (
              <MetaChip icon={Briefcase}>
                {service.providerExperience} il təcrübə
              </MetaChip>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <Link
              href={providerPublicPath(service.providerId)}
              className="text-sm font-semibold text-foreground underline-offset-2 hover:underline"
            >
              {service.providerName}
            </Link>
            {service.reviewCount > 0 ? (
              <div className="mt-2">
                <ProviderReviewsTrigger
                  providerId={service.providerId}
                  providerName={service.providerName}
                  averageRating={service.averageRating}
                  reviewCount={service.reviewCount}
                  serviceId={service.id}
                  serviceTitle={service.title}
                />
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Hələ rəy yoxdur</p>
            )}
          </div>

          <ServiceOrderButton
            service={service}
            className="h-11 w-full touch-manipulation text-sm sm:h-12"
          />
        </aside>
      </div>

      {reviews.length > 0 ? (
        <section aria-labelledby="service-reviews-heading" className="border-t border-border/60 pt-8">
          <h2 id="service-reviews-heading" className="text-lg font-semibold tracking-tight">
            Rəylər
          </h2>
          <ul className="mt-2 divide-y divide-border">
            {reviews.map((review) => (
              <ReviewListItem key={review.id} review={review} />
            ))}
          </ul>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section aria-labelledby="related-services-heading" className="border-t border-border/60 pt-8">
          <h2 id="related-services-heading" className="text-lg font-semibold tracking-tight">
            Oxşar xidmətlər
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            {related.map((item) => (
              <ServiceCard
                key={item.id}
                service={item}
                categorySlug={item.categorySlug}
                showCategoryHeader={false}
              />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

function MetaChip({
  icon: Icon,
  children,
}: {
  icon: typeof MapPin;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 text-xs text-muted-foreground ring-1 ring-border/60">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {children}
    </span>
  );
}
