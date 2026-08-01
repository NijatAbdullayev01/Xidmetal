'use client';

import { useQuery } from '@tanstack/react-query';
import { Star, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReviewListItem } from '@/components/reviews/review-list-item';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';

export default function ProviderRatingsPage() {
  const token = useAuthToken();

  const { data: profile } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => api.users.me(token!),
    enabled: !!token,
  });

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews', 'received'],
    queryFn: () => api.reviewsReceived(token!, { limit: '50' }),
    enabled: !!token,
  });

  const rating = profile?.providerProfile?.rating ?? 0;
  const reviewCount = profile?.providerProfile?.reviewCount ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reytinq</h1>
        <p className="mt-1 text-muted-foreground">
          Müştərilərin sizə verdiyi qiymətləndirmələr və rəylər.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand/15">
              <Star className="h-7 w-7 fill-brand text-brand" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Orta reytinq</p>
              <p className="text-3xl font-bold">
                {reviewCount > 0 ? rating.toFixed(1) : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div>
              <p className="text-sm text-muted-foreground">Ümumi rəy sayı</p>
              <p className="text-3xl font-bold">{reviewCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Müştəri rəyləri</CardTitle>
          <CardDescription>
            Təsdiqlənmiş rəylər burada göstərilir
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
            </div>
          )}

          {!isLoading && reviews?.items.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">
              Hələ heç bir rəy yoxdur. Xidmətlərinizi tamamladıqca müştərilər rəy yaza biləcək.
            </p>
          )}

          <ul className="divide-y divide-border">
            {reviews?.items.map((review) => (
              <ReviewListItem key={review.id} review={review} />
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
