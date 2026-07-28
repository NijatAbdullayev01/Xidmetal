import { Star, MapPin, Wifi, User, Briefcase } from 'lucide-react';
import type { ServiceSummary } from '@xidmetal/shared';
import { formatPrice, cn } from '@/lib/utils';
import { ServiceOrderButton } from '@/components/services/service-order-button';
import { getCategoryIcon } from '@/lib/category-icons';
import { getPriceUnitLabel } from '@/lib/provider-labels';

function StarIcon({ fillPercent }: { fillPercent: number }) {
  return (
    <span className="relative inline-block h-3.5 w-3.5 shrink-0">
      <Star
        className="absolute inset-0 h-3.5 w-3.5 text-muted-foreground/35"
        strokeWidth={1.5}
        aria-hidden
      />
      {fillPercent > 0 ? (
        <span
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${fillPercent}%` }}
        >
          <Star
            className="h-3.5 w-3.5 fill-brand text-brand"
            strokeWidth={1.5}
            aria-hidden
          />
        </span>
      ) : null}
    </span>
  );
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  const normalizedRating = Math.min(5, Math.max(0, rating));
  const ariaLabel =
    count > 0
      ? `${normalizedRating.toFixed(1)} reytinq, ${count} rəy`
      : 'Hələ reytinq yoxdur';

  return (
    <div className="flex shrink-0 flex-col items-start gap-0.5" aria-label={ariaLabel}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <StarIcon
            key={index}
            fillPercent={Math.min(100, Math.max(0, (normalizedRating - index) * 100))}
          />
        ))}
      </div>
      {count > 0 ? (
        <span className="text-[11px] text-muted-foreground">({count} rəy)</span>
      ) : null}
    </div>
  );
}

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
        alt={name}
        className="h-10 w-10 rounded-full object-cover ring-2 ring-background"
      />
    );
  }

  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand/50 to-brand/20 text-xs font-bold text-brand-foreground ring-2 ring-background"
      aria-hidden
    >
      {initials || <User className="h-4 w-4" />}
    </div>
  );
}

function RemoteBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-foreground ring-1 ring-brand/25">
      <Wifi className="h-3 w-3 text-brand-dark" aria-hidden />
      Onlayn
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

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand/8 hover:ring-brand/35">
      {showCategoryHeader ? (
        <div className="relative flex items-center justify-between gap-3 bg-gradient-to-r from-brand/12 via-brand/5 to-transparent px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/20 shadow-sm ring-1 ring-brand/25 transition-transform duration-300 group-hover:scale-105">
              <Icon className="h-5 w-5 text-brand-foreground" strokeWidth={1.75} aria-hidden />
            </div>
            <span className="truncate text-sm font-semibold text-foreground">
              {service.categoryName}
            </span>
          </div>

          {service.isRemote && <RemoteBadge />}
        </div>
      ) : null}

      {/* Əsas məzmun */}
      <div className={cn('flex flex-1 flex-col px-5 pb-5', showCategoryHeader ? 'pt-4' : 'pt-5')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              {!showCategoryHeader && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 ring-1 ring-brand/20 transition-transform duration-300 group-hover:scale-105">
                  <Icon className="h-5 w-5 text-brand-foreground" strokeWidth={1.75} aria-hidden />
                </div>
              )}
              <h3 className="min-w-0 flex-1 line-clamp-2 text-[1.05rem] font-semibold leading-snug tracking-tight transition-colors group-hover:text-brand-dark">
                {service.title}
              </h3>
            </div>
            <div className={cn(!showCategoryHeader && 'pl-[calc(2.5rem+0.75rem)]')}>
              <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {service.description}
              </p>
              {(service.location ||
                (service.providerExperience != null && service.providerExperience > 0)) && (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  {service.location && (
                    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-dark/70" aria-hidden />
                      <span className="truncate">{service.location}</span>
                    </p>
                  )}
                  {service.providerExperience != null && service.providerExperience > 0 && (
                    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Briefcase className="h-3.5 w-3.5 shrink-0 text-brand-dark/70" aria-hidden />
                      <span>{service.providerExperience} il təcrübə</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          {!showCategoryHeader && service.isRemote ? <RemoteBadge /> : null}
        </div>
      </div>

      {/* Qiymət və CTA */}
      <div className="flex items-center justify-between gap-3 border-t border-border/50 px-5 py-3.5">
        <p className="text-xl font-bold tracking-tight text-foreground">
          {formatPrice(service.price)}
          {service.price > 0 && (
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">
              / {getPriceUnitLabel(service.priceUnit)}
            </span>
          )}
        </p>
        <ServiceOrderButton service={service} />
      </div>

      {/* Provayder */}
      <div className="flex items-center gap-3 border-t border-border/50 bg-muted/25 px-5 py-4">
        <ProviderAvatar
          name={service.providerName}
          avatarUrl={service.providerAvatarUrl}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{service.providerName}</p>
          <p className="text-xs text-muted-foreground">Xidmət verən</p>
          <div className="mt-1">
            <StarRating rating={service.averageRating} count={service.reviewCount} />
          </div>
        </div>
      </div>
    </article>
  );
}
