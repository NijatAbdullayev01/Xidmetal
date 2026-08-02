'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MessageSquareText, Star, X } from 'lucide-react';
import type { RatingDistribution } from '@xidmetal/shared';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ReviewListItem } from '@/components/reviews/review-list-item';
import { ReviewStars } from '@/components/reviews/review-stars';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

interface ProviderReviewsDialogProps {
  open: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
  /** Kart üzərindəki reytinq — ilk yüklənmədən əvvəl göstərilir */
  averageRating: number;
  reviewCount: number;
  /** Verildikdə yalnız bu xidmətə aid rəylər göstərilir */
  serviceId?: string;
  serviceTitle?: string;
}

function RatingBars({
  distribution,
  total,
}: {
  distribution: RatingDistribution;
  total: number;
}) {
  return (
    <div className="space-y-1.5" aria-label="Reytinq paylanması">
      {([5, 4, 3, 2, 1] as const).map((stars) => {
        const count = distribution[stars];
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={stars} className="flex items-center gap-2 text-xs">
            <span className="w-3 tabular-nums text-muted-foreground">{stars}</span>
            <Star className="h-3 w-3 fill-brand text-brand" aria-hidden />
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="w-7 text-right tabular-nums text-muted-foreground">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ProviderReviewsDialog({
  open,
  onClose,
  providerId,
  providerName,
  averageRating,
  reviewCount,
  serviceId,
  serviceTitle,
}: ProviderReviewsDialogProps) {
  const [page, setPage] = useState(1);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      page: String(page),
      limit: String(PAGE_SIZE),
    };
    if (serviceId) {
      params.serviceId = serviceId;
    }
    return params;
  }, [page, serviceId]);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['reviews', 'provider', providerId, queryParams],
    queryFn: () => api.reviewsByProvider(providerId, queryParams),
    enabled: open && !!providerId,
  });

  const stats = data?.stats;
  const displayRating = stats?.averageRating ?? averageRating;
  const displayCount = stats?.reviewCount ?? reviewCount;
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  const handleClose = () => {
    onClose();
    setPage(1);
  };

  const subtitle = serviceTitle
    ? `${providerName} · ${serviceTitle}`
    : providerName;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        serviceTitle
          ? `${serviceTitle} — müştəri rəyləri`
          : `${providerName} — müştəri rəyləri`
      }
      description={
        serviceId
          ? 'Bu xidmət üçün müştəri rəyləri'
          : 'Digər müştərilərin bu xidmət verənə yazdığı rəylər'
      }
      panelClassName="max-w-xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">Müştəri rəyləri</h2>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Bağla"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-start sm:gap-1">
            <p className="text-4xl font-bold tracking-tight tabular-nums">
              {displayCount > 0 ? displayRating.toFixed(1) : '—'}
            </p>
            <div>
              <ReviewStars rating={Math.round(displayRating)} />
              <p className="mt-1 text-xs text-muted-foreground">
                {displayCount > 0 ? `${displayCount} rəy` : 'Hələ rəy yoxdur'}
              </p>
            </div>
          </div>
          {stats && displayCount > 0 ? (
            <div className="min-w-0 flex-1">
              <RatingBars
                distribution={stats.ratingDistribution}
                total={stats.reviewCount}
              />
            </div>
          ) : null}
        </div>

        <div className="mt-5 border-t border-border/50 pt-1">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand" aria-label="Yüklənir" />
            </div>
          ) : null}

          {isError ? (
            <p className="py-10 text-center text-sm text-destructive" role="alert">
              Rəylər yüklənə bilmədi. Bir az sonra yenidən cəhd edin.
            </p>
          ) : null}

          {!isLoading && !isError && items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <MessageSquareText className="h-8 w-8 text-muted-foreground/50" aria-hidden />
              <p className="text-sm text-muted-foreground">
                {serviceId
                  ? 'Bu xidmət üçün hələ rəy yoxdur.'
                  : 'Bu xidmət verənə hələ rəy yazılmayıb.'}
              </p>
            </div>
          ) : null}

          {!isLoading && !isError && items.length > 0 ? (
            <ul className={cn('divide-y divide-border', isFetching && 'opacity-70')}>
              {items.map((review) => (
                <ReviewListItem key={review.id} review={review} />
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Əvvəlki
          </Button>
          <p className="text-xs tabular-nums text-muted-foreground">
            {page} / {totalPages}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isFetching}
            onClick={() => setPage((current) => current + 1)}
          >
            Növbəti
          </Button>
        </div>
      ) : null}
    </Modal>
  );
}
