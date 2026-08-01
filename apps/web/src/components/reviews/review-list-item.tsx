import type { ReviewSummary } from '@xidmetal/shared';
import { formatDate } from '@/lib/utils';
import { ReviewStars } from '@/components/reviews/review-stars';

export function ReviewListItem({ review }: { review: ReviewSummary }) {
  return (
    <li className="py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{review.authorName}</p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{review.serviceTitle}</p>
        </div>
        <div className="shrink-0 text-right">
          <ReviewStars rating={review.rating} />
          <p className="mt-1 text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
        </div>
      </div>
      {review.comment ? (
        <p className="mt-2 rounded-lg bg-muted/80 px-3 py-2 text-sm leading-relaxed text-foreground">
          {review.comment}
        </p>
      ) : null}
    </li>
  );
}
