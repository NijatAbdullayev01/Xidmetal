import type { ReviewSummary } from '@xidmetal/shared';
import { formatDate } from '@/lib/utils';
import { ReviewStars } from '@/components/reviews/review-stars';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Moderasiyada',
  APPROVED: 'Təsdiqlənib',
  REJECTED: 'İmtina edilib',
};

export function ReviewListItem({ review }: { review: ReviewSummary }) {
  const statusLabel = STATUS_LABEL[review.status] ?? review.status;

  return (
    <li className="py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-foreground">{review.authorName}</p>
            {review.status !== 'APPROVED' && (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
                {statusLabel}
              </span>
            )}
          </div>
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
