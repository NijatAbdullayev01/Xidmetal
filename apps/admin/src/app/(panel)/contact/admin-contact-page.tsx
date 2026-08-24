'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { adminListQueryOptions, refreshAdminQueries } from '@/lib/admin-queries';

export function AdminContactPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('unread');
  const [error, setError] = useState<string | null>(null);

  const params: Record<string, string> = { page: String(page), limit: '20' };
  if (filter === 'unread') params.isRead = 'false';
  if (filter === 'read') params.isRead = 'true';

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'contact', params],
    queryFn: () => api.admin.contact(token!, params),
    enabled: !!token,
    ...adminListQueryOptions,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.admin.markContactRead(token!, id),
    onSuccess: async () => {
      setError(null);
      await refreshAdminQueries(queryClient, ['admin', 'contact']);
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Əməliyyat uğursuz oldu');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Əlaqə mesajları</h1>
        <p className="mt-1 text-muted-foreground">
          İctimai əlaqə formasından gələn mesajlar.
        </p>
      </div>

      <Card>
        <CardHeader className="gap-4 space-y-0">
          <CardTitle className="text-base">Filter</CardTitle>
          <Select
            value={filter}
            onChange={(value) => {
              setFilter(value as 'all' | 'unread' | 'read');
              setPage(1);
            }}
            options={[
              { value: 'unread', label: 'Oxunmamış' },
              { value: 'read', label: 'Oxunmuş' },
              { value: 'all', label: 'Hamısı' },
            ]}
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
            <p className="py-8 text-center text-sm text-muted-foreground">Mesaj yoxdur</p>
          )}
          <ul className="divide-y divide-border">
            {data?.items.map((item) => (
              <li key={item.id} className="space-y-2 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{item.subject}</p>
                  <Badge variant={item.isRead ? 'muted' : 'warning'}>
                    {item.isRead ? 'Oxunub' : 'Yeni'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {item.name} · {item.email}
                  {item.phone ? ` · ${item.phone}` : ''}
                </p>
                <p className="whitespace-pre-wrap text-sm">{item.message}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString('az-AZ')}
                </p>
                {!item.isRead && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-[44px]"
                    disabled={markRead.isPending}
                    onClick={() => markRead.mutate(item.id)}
                  >
                    Oxundu işarələ
                  </Button>
                )}
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
