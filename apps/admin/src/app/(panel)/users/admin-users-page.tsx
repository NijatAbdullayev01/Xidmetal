'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserRole } from '@xidmetal/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';

const ACTIVE_OPTIONS = [
  { value: '', label: 'Hamısı' },
  { value: 'true', label: 'Aktiv' },
  { value: 'false', label: 'Deaktiv' },
];

export function AdminUsersPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const params: Record<string, string> = {
    page: String(page),
    limit: '20',
    role: UserRole.CUSTOMER,
  };
  if (search.trim()) params.search = search.trim();
  if (isActive) params.isActive = isActive;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => api.admin.users(token!, params),
    enabled: !!token,
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, next }: { id: string; next: boolean }) =>
      api.admin.setUserActive(token!, id, { isActive: next }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Əməliyyat uğursuz oldu');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Müştərilər</h1>
        <p className="mt-1 text-muted-foreground">
          Müştəri hesablarını axtarın, filtrələyin və aktivlik statusunu idarə edin.
        </p>
      </div>

      <Card>
        <CardHeader className="gap-4 space-y-0">
          <CardTitle className="text-base">Filtrlər</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Ad, soyad, e-poçt və ya telefon"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <Select
              value={isActive}
              onChange={(v) => {
                setIsActive(v);
                setPage(1);
              }}
              options={ACTIVE_OPTIONS}
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
            <p className="py-8 text-center text-sm text-muted-foreground">Müştəri tapılmadı</p>
          )}

          <ul className="divide-y divide-border">
            {data?.items.map((user) => (
              <li
                key={user.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <Badge variant={user.isActive ? 'success' : 'destructive'}>
                      {user.isActive ? 'Aktiv' : 'Deaktiv'}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                  {user.phone ? (
                    <p className="text-sm text-muted-foreground">
                      <a href={`tel:${user.phone}`} className="hover:text-foreground">
                        {user.phone}
                      </a>
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Qeydiyyat: {new Date(user.createdAt).toLocaleDateString('az-AZ')}
                  </p>
                </div>
                <Button
                  variant={user.isActive ? 'outline' : 'default'}
                  size="sm"
                  className="min-h-[44px] shrink-0"
                  disabled={toggleActive.isPending}
                  onClick={() => toggleActive.mutate({ id: user.id, next: !user.isActive })}
                >
                  {user.isActive ? 'Deaktiv et' : 'Aktiv et'}
                </Button>
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
