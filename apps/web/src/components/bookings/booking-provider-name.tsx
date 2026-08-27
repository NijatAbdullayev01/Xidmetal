'use client';

import { ProviderReviewsTrigger } from '@/components/reviews/provider-reviews-trigger';

interface BookingProviderNameProps {
  providerId: string;
  providerName: string;
  rating?: number;
  reviewCount?: number;
  /** Təcili sifarişdə yalnız qəbuldan sonra true */
  showRating?: boolean;
  labeled?: boolean;
}

export function BookingProviderName({
  providerId,
  providerName,
  rating = 0,
  reviewCount = 0,
  showRating = false,
  labeled = true,
}: BookingProviderNameProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {labeled ? <span className="text-foreground">Xidmət verən:</span> : null}
      <span className={labeled ? 'text-muted-foreground' : undefined}>
        {providerName}
      </span>
      {showRating ? (
        <ProviderReviewsTrigger
          providerId={providerId}
          providerName={providerName}
          averageRating={rating}
          reviewCount={reviewCount}
          compact
        />
      ) : null}
    </div>
  );
}
