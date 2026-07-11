import Link from 'next/link';
import { Star, MapPin, Wifi, ArrowRight, User } from 'lucide-react';
import type { ServiceSummary } from '@xidmetal/shared';
import { formatPrice, cn } from '@/lib/utils';
import { buttonStyles } from '@/components/ui/button';
import { getCategoryIcon } from '@/lib/category-icons';
import { PRICE_UNIT_LABELS } from '@/lib/provider-labels';

function StarRating({ rating, count }: { rating: number; count: number }) {
  if (count === 0) {
    return null;
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1"
      aria-label={`${rating.toFixed(1)} reytinq, ${count} rəy`}
    >
      <Star className="h-3.5 w-3.5 fill-brand text-brand" aria-hidden />
      <span className="text-xs font-semibold text-foreground">{rating.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
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
        alt=""
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

export function ServiceCard({
  service,
  categorySlug,
}: {
  service: ServiceSummary;
  categorySlug?: string;
}) {
  const Icon = getCategoryIcon(categorySlug ?? '');

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand/8 hover:ring-brand/35">
      {/* Kateqoriya başlığı */}
      <div className="relative flex items-center justify-between gap-3 bg-gradient-to-r from-brand/12 via-brand/5 to-transparent px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/20 shadow-sm ring-1 ring-brand/25 transition-transform duration-300 group-hover:scale-105">
            <Icon className="h-5 w-5 text-brand-foreground" strokeWidth={1.75} aria-hidden />
          </div>
          <span className="truncate text-sm font-semibold text-foreground">
            {service.categoryName}
          </span>
        </div>

        {service.isRemote && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm ring-1 ring-border/60">
            <Wifi className="h-3 w-3 text-brand-dark" aria-hidden />
            Onlayn
          </span>
        )}
      </div>

      {/* Əsas məzmun */}
      <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
        <h3 className="line-clamp-2 text-[1.05rem] font-semibold leading-snug tracking-tight transition-colors group-hover:text-brand-dark">
          {service.title}
        </h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {service.description}
        </p>
      </div>

      {/* Qiymət, ünvan və reytinq */}
      <div className="flex items-center justify-between gap-3 border-t border-border/50 px-5 py-3.5">
        <div className="min-w-0">
          <p className="text-xl font-bold tracking-tight text-foreground">
            {formatPrice(service.price)}
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">
              / {PRICE_UNIT_LABELS[service.priceUnit] ?? service.priceUnit}
            </span>
          </p>
          {service.isRemote ? (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wifi className="h-3.5 w-3.5 shrink-0 text-brand-dark/70" aria-hidden />
              <span>Onlayn</span>
            </p>
          ) : service.location ? (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-dark/70" aria-hidden />
              <span className="truncate">{service.location}</span>
            </p>
          ) : null}
        </div>
        <StarRating rating={service.averageRating} count={service.reviewCount} />
      </div>

      {/* Provayder və CTA */}
      <div className="flex items-center gap-3 border-t border-border/50 bg-muted/25 px-5 py-4">
        <ProviderAvatar
          name={service.providerName}
          avatarUrl={service.providerAvatarUrl}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{service.providerName}</p>
          <p className="text-xs text-muted-foreground">Xidmət verən</p>
        </div>
        <Link
          href="/register"
          className={cn(
            buttonStyles('default', 'sm'),
            'shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-[1.02]',
          )}
        >
          Sifariş et
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
