import type { ReactNode } from 'react';
import { MapPin, Wifi, User, Briefcase, type LucideIcon } from 'lucide-react';
import type { ServiceSummary } from '@xidmetal/shared';
import { formatPrice, cn } from '@/lib/utils';
import { ServiceOrderButton } from '@/components/services/service-order-button';
import { ServiceDescription } from '@/components/services/service-description';
import { ServiceImagesPreview } from '@/components/services/service-images-preview';
import { ProviderReviewsTrigger } from '@/components/reviews/provider-reviews-trigger';
import { getCategoryIcon } from '@/lib/category-icons';
import { getPriceUnitLabel } from '@/lib/provider-labels';

function ProviderAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string;
}) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className="h-11 w-11 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand-foreground"
      aria-hidden
    >
      {initials || <User className="h-4 w-4" />}
    </div>
  );
}

function RemoteBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-md bg-brand/10 px-1.5 py-0.5 text-[11px] font-medium leading-none text-foreground ring-1 ring-brand/20 sm:text-xs',
        className,
      )}
    >
      <Wifi className="h-3 w-3 text-brand-dark" aria-hidden />
      Onlayn
    </span>
  );
}

function MetaChip({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-[11px] leading-none text-muted-foreground sm:text-xs">
      <Icon className="h-3 w-3 shrink-0 text-muted-foreground/80 sm:h-3.5 sm:w-3.5" aria-hidden />
      <span className="truncate">{children}</span>
    </span>
  );
}

export function ServiceCard({
  service,
  categorySlug,
  showCategoryHeader = true,
}: {
  service: ServiceSummary;
  categorySlug?: string;
  /** Kateqoriya səhifəsində false — səhifə başlığı artıq konteksti verir */
  showCategoryHeader?: boolean;
}) {
  const Icon = getCategoryIcon(categorySlug ?? '');
  const hasExperience =
    service.providerExperience != null && service.providerExperience > 0;
  const hasLocation = Boolean(service.location);
  const showMeta = hasLocation || hasExperience || service.isRemote;
  const images = service.images ?? [];
  const hasImages = images.length > 0;

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl bg-card pb-3.5',
        'ring-1 ring-border/70 transition-[box-shadow,ring-color] duration-200',
        'hover:shadow-md hover:ring-brand/30',
      )}
    >
      {hasImages ? (
        <ServiceImagesPreview images={images} title={service.title} />
      ) : (
        <div
          className="relative aspect-[16/10] w-full bg-muted"
          aria-hidden
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/15 ring-1 ring-brand/20">
              <Icon className="h-6 w-6 text-brand-foreground" strokeWidth={1.75} />
            </div>
          </div>
        </div>
      )}

      {/* 1. Təklif — nə təklif olunur */}
      <div className="flex min-h-0 flex-1 flex-col px-5 pt-4">
        {showCategoryHeader ? (
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            {service.categoryName}
          </p>
        ) : null}

        <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground sm:text-[1.05rem]">
          {service.title}
        </h3>

        {service.description ? (
          <ServiceDescription
            description={service.description}
            title={service.title}
          />
        ) : null}

        {/* 2. Etibar — bütün kartlarda eyni yerdə (məzmunun altında) */}
        <div className="mt-auto flex items-start gap-3 pt-4">
          <ProviderAvatar
            name={service.providerName}
            avatarUrl={service.providerAvatarUrl}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {service.providerName}
            </p>
            <div className="mt-1">
              <ProviderReviewsTrigger
                providerId={service.providerId}
                providerName={service.providerName}
                averageRating={service.averageRating}
                reviewCount={service.reviewCount}
                serviceId={service.id}
                serviceTitle={service.title}
                compact
              />
            </div>
          </div>
          {showCategoryHeader ? (
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 ring-1 ring-brand/20"
              title={service.categoryName}
            >
              <Icon className="h-4 w-4 text-brand-foreground" strokeWidth={1.75} aria-hidden />
              <span className="sr-only">{service.categoryName}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* 3. Qərar — qiymət + hərəkət */}
      <div className="mt-4 border-t border-border/60 px-5 pt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate">
            {service.price > 0 ? (
              <>
                <span className="text-base font-bold tracking-tight text-foreground tabular-nums">
                  {formatPrice(service.price)}
                </span>
                <span className="ml-1 text-xs text-muted-foreground">
                  / {getPriceUnitLabel(service.priceUnit)}
                </span>
              </>
            ) : (
              <span className="text-sm font-semibold text-foreground">
                {formatPrice(service.price)}
              </span>
            )}
          </p>

          <ServiceOrderButton
            service={service}
            className="h-9 shrink-0 touch-manipulation px-3 text-sm"
          />
        </div>

        {/* 4. Kontekst — hündürlük sabitdir ki, provider bloku hizalansın */}
        <div
          className={cn(
            'mt-3 flex min-h-[1.375rem] items-center justify-between gap-3 pt-2.5',
            showMeta && '-mx-5 border-t border-border/60 px-5',
          )}
          aria-label={showMeta ? 'Xidmət məlumatları' : undefined}
          aria-hidden={!showMeta}
        >
          {showMeta ? (
            <>
              <div className="flex min-w-0 items-center gap-2">
                {hasLocation ? (
                  <MetaChip icon={MapPin}>{service.location}</MetaChip>
                ) : null}
                {service.isRemote ? <RemoteBadge /> : null}
              </div>
              {hasExperience ? (
                <MetaChip icon={Briefcase}>
                  {service.providerExperience} il təcrübə
                </MetaChip>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
