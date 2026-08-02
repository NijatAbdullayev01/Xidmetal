'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const ProviderReviewsDialog = dynamic(
  () =>
    import('@/components/reviews/provider-reviews-dialog').then((mod) => ({
      default: mod.ProviderReviewsDialog,
    })),
  { ssr: false },
);

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

interface ProviderReviewsTriggerProps {
  providerId: string;
  providerName: string;
  averageRating: number;
  reviewCount: number;
  serviceId?: string;
  serviceTitle?: string;
  /** Kartlarda bir sətirdə sıx göstərim */
  compact?: boolean;
  className?: string;
}

export function ProviderReviewsTrigger({
  providerId,
  providerName,
  averageRating,
  reviewCount,
  serviceId,
  serviceTitle,
  compact = false,
  className,
}: ProviderReviewsTriggerProps) {
  const [open, setOpen] = useState(false);
  const normalizedRating = Math.min(5, Math.max(0, averageRating));
  const hasReviews = reviewCount > 0;

  const ariaLabel = hasReviews
    ? `${normalizedRating.toFixed(1)} reytinq, ${reviewCount} rəy — rəylərə bax`
    : 'Hələ reytinq yoxdur';

  if (!hasReviews) {
    return (
      <div
        className={cn(
          compact
            ? 'flex items-center gap-1.5 text-xs text-muted-foreground'
            : 'flex shrink-0 flex-col items-start gap-0.5',
          className,
        )}
        aria-label={ariaLabel}
      >
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <StarIcon key={index} fillPercent={0} />
          ))}
        </div>
        <span className={cn(compact ? 'text-xs' : 'text-[11px]', 'text-muted-foreground')}>
          Rəy yoxdur
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'group/reviews rounded-lg text-left transition-colors hover:bg-brand/10',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-card',
          compact
            ? 'inline-flex max-w-full items-center gap-1.5 -mx-1 -my-0.5 px-1 py-0.5'
            : 'flex shrink-0 flex-col items-start gap-0.5 -mx-1.5 -my-1 px-1.5 py-1',
          className,
        )}
        aria-label={ariaLabel}
      >
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <StarIcon
                key={index}
                fillPercent={Math.min(100, Math.max(0, (normalizedRating - index) * 100))}
              />
            ))}
          </div>
          <span className="text-xs font-semibold tabular-nums text-foreground">
            {normalizedRating.toFixed(1)}
          </span>
        </div>
        <span
          className={cn(
            'font-medium text-brand-dark underline-offset-2 group-hover/reviews:underline',
            compact ? 'truncate text-xs' : 'text-[11px]',
          )}
        >
          {compact ? `${reviewCount} rəy` : `${reviewCount} rəy — bax`}
        </span>
      </button>

      {open ? (
        <ProviderReviewsDialog
          open
          onClose={() => setOpen(false)}
          providerId={providerId}
          providerName={providerName}
          averageRating={averageRating}
          reviewCount={reviewCount}
          serviceId={serviceId}
          serviceTitle={serviceTitle}
        />
      ) : null}
    </>
  );
}
