'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ServiceStatus } from '@xidmetal/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { formatPrice } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: 'Bütün statuslar' },
  { value: ServiceStatus.DRAFT, label: 'Qaralama' },
  { value: ServiceStatus.ACTIVE, label: 'Aktiv' },
  { value: ServiceStatus.PAUSED, label: 'Dayandırılıb' },
  { value: ServiceStatus.ARCHIVED, label: 'Arxiv' },
];

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Qaralama',
  ACTIVE: 'Aktiv',
  PAUSED: 'Dayandırılıb',
  ARCHIVED: 'Arxiv',
};

const STATUS_BADGE: Record<string, 'muted' | 'success' | 'warning' | 'destructive'> = {
  DRAFT: 'muted',
  ACTIVE: 'success',
  PAUSED: 'warning',
  ARCHIVED: 'destructive',
};

export default function AdminServicesPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const params: Record<string, string> = { page: String(page), limit: '20' };
  if (search.trim()) params.search = search.trim();
  if (status) params.status = status;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'services', params],
    queryFn: () => api.admin.services(token!, params),
    enabled: !!token,
  });

  const setStatusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: ServiceStatus }) =>
      api.admin.setServiceStatus(token!, id, { status: next }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Əməliyyat uğursuz oldu');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Xidmətlər</h1>
        <p className="mt-1 text-muted-foreground">
          Bütün elanları izləyin və statusunu dəyişin (aktiv / dayandır / arxiv).
        </p>
      </div>

      <Card>
        <CardHeader className="gap-4 space-y-0">
          <CardTitle className="text-base">Filtrlər</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Başlıq və ya provider"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
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
          </div>
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
            <p className="py-8 text-center text-sm text-muted-foreground">Xidmət tapılmadı</p>
          )}

          <ul className="divide-y divide-border">
            {data?.items.map((service) => (
              <li
                key={service.id}
                className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{service.title}</p>
                    <Badge variant={STATUS_BADGE[service.status] ?? 'muted'}>
                      {STATUS_LABEL[service.status] ?? service.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {service.categoryName} · {service.providerName} ·{' '}
                    {formatPrice(service.price)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {service.status !== ServiceStatus.ACTIVE && (
                    <Button
                      size="sm"
                      className="min-h-[44px]"
                      disabled={setStatusMutation.isPending}
                      onClick={() =>
                        setStatusMutation.mutate({
                          id: service.id,
                          next: ServiceStatus.ACTIVE,
                        })
                      }
                    >
                      Aktiv et
                    </Button>
                  )}
                  {service.status === ServiceStatus.ACTIVE && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[44px]"
                      disabled={setStatusMutation.isPending}
                      onClick={() =>
                        setStatusMutation.mutate({
                          id: service.id,
                          next: ServiceStatus.PAUSED,
                        })
                      }
                    >
                      Dayandır
                    </Button>
                  )}
                  {service.status !== ServiceStatus.ARCHIVED && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[44px]"
                      disabled={setStatusMutation.isPending}
                      onClick={() =>
                        setStatusMutation.mutate({
                          id: service.id,
                          next: ServiceStatus.ARCHIVED,
                        })
                      }
                    >
                      Arxivlə
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
