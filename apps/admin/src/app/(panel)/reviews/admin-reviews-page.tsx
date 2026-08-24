'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ReviewStatus } from '@xidmetal/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { adminListQueryOptions, refreshAdminQueries } from '@/lib/admin-queries';

const STATUS_OPTIONS = [
  { value: '', label: 'Bütün statuslar' },
  { value: ReviewStatus.PENDING, label: 'Gözləyir' },
  { value: ReviewStatus.APPROVED, label: 'Təsdiqlənib' },
  { value: ReviewStatus.REJECTED, label: 'İmtina edilib' },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Gözləyir',
  APPROVED: 'Təsdiqlənib',
  REJECTED: 'İmtina edilib',
};

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'destructive' | 'muted'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
};

export function AdminReviewsPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const params: Record<string, string> = { page: String(page), limit: '20' };
  if (status) params.status = status;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reviews', params],
    queryFn: () => api.admin.reviews(token!, params),
    enabled: !!token,
    ...adminListQueryOptions,
  });

  const moderate = useMutation({
    mutationFn: ({
      id,
      next,
    }: {
      id: string;
      next: ReviewStatus.APPROVED | ReviewStatus.REJECTED;
    }) => api.admin.setReviewStatus(token!, id, { status: next }),
    onSuccess: async () => {
      setError(null);
      await refreshAdminQueries(queryClient, ['admin', 'reviews']);
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Əməliyyat uğursuz oldu');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rəylər</h1>
        <p className="mt-1 text-muted-foreground">
          Rəylər dərhal dərc olunur. İmtina etsəniz, reytinq və ictimai siyahıdan çıxarılır.
        </p>
      </div>

      <Card>
        <CardHeader className="gap-4 space-y-0">
          <CardTitle className="text-base">Filtr</CardTitle>
          <Select
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={STATUS_OPTIONS}
            placeholder="Status"
            clearable
          />
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">Yüklənir…</p>
          )}
          {!isLoading && data?.items.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Rəy tapılmadı</p>
          )}

          <ul className="divide-y divide-border">
            {data?.items.map((review) => (
              <li key={review.id} className="space-y-3 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{review.serviceTitle}</p>
                  <Badge variant={STATUS_BADGE[review.status] ?? 'muted'}>
                    {STATUS_LABEL[review.status] ?? review.status}
                  </Badge>
                  <span className="text-sm font-medium text-brand-dark">
                    {'★'.repeat(review.rating)}
                    {'☆'.repeat(5 - review.rating)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {review.authorName} → {review.providerName} ·{' '}
                  {new Date(review.createdAt).toLocaleDateString('az-AZ')}
                </p>
                {review.comment && <p className="text-sm">{review.comment}</p>}
                <div className="flex flex-wrap gap-2">
                  {review.status !== ReviewStatus.APPROVED && (
                    <Button
                      size="sm"
                      className="min-h-[44px]"
                      disabled={moderate.isPending}
                      onClick={() =>
                        moderate.mutate({ id: review.id, next: ReviewStatus.APPROVED })
                      }
                    >
                      Təsdiqlə
                    </Button>
                  )}
                  {review.status !== ReviewStatus.REJECTED && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[44px]"
                      disabled={moderate.isPending}
                      onClick={() =>
                        moderate.mutate({ id: review.id, next: ReviewStatus.REJECTED })
                      }
                    >
                      Rədd et
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {data && data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Əvvəlki
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Növbəti
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
