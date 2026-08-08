'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserRole } from '@xidmetal/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';

export default function AdminProvidersPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const params: Record<string, string> = {
    page: String(page),
    limit: '20',
    role: UserRole.PROVIDER,
  };
  if (search.trim()) params.search = search.trim();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'providers', params],
    queryFn: () => api.admin.users(token!, params),
    enabled: !!token,
  });

  const verify = useMutation({
    mutationFn: ({ userId, next }: { userId: string; next: boolean }) =>
      api.admin.setProviderVerified(token!, userId, { isVerified: next }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'providers'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Əməliyyat uğursuz oldu');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Xidmət verənlər</h1>
        <p className="mt-1 text-muted-foreground">
          Xidmət verən qeydiyyatdan sonra burada təsdiq almalıdır. Təsdiqsiz hesab
          xidmət aktivləşdirə və sifariş qəbul edə bilməz.
        </p>
      </div>

      <Card>
        <CardHeader className="gap-4 space-y-0">
          <CardTitle className="text-base">Axtarış</CardTitle>
          <Input
            placeholder="Ad, soyad və ya e-poçt"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
            <p className="py-8 text-center text-sm text-muted-foreground">
              Xidmət verən tapılmadı
            </p>
          )}

          <ul className="divide-y divide-border">
            {data?.items.map((user) => {
              const verified = user.providerProfile?.isVerified ?? false;
              return (
                <li
                  key={user.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      <Badge variant={verified ? 'success' : 'warning'}>
                        {verified ? 'Təsdiqlənib' : 'Gözləyir'}
                      </Badge>
                      {!user.isActive && <Badge variant="destructive">Deaktiv</Badge>}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.providerProfile?.location ?? 'Ünvan yoxdur'} · Reytinq{' '}
                      {(user.providerProfile?.rating ?? 0).toFixed(1)} (
                      {user.providerProfile?.reviewCount ?? 0}) ·{' '}
                      {user._count?.services ?? 0} xidmət
                    </p>
                  </div>
                  <Button
                    variant={verified ? 'outline' : 'default'}
                    size="sm"
                    className="min-h-[44px] shrink-0"
                    disabled={verify.isPending}
                    onClick={() => verify.mutate({ userId: user.id, next: !verified })}
                  >
                    {verified ? 'Təsdiqi ləğv et' : 'Təsdiqlə'}
                  </Button>
                </li>
              );
            })}
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
