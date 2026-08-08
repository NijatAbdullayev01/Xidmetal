'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ServiceStatus } from '@xidmetal/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { formatPrice } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: ServiceStatus.PENDING_REVIEW, label: 'Yoxlama gözləyir' },
  { value: '', label: 'Bütün statuslar' },
  { value: ServiceStatus.DRAFT, label: 'Qaralama' },
  { value: ServiceStatus.NEEDS_REVISION, label: 'Düzəliş lazımdır' },
  { value: ServiceStatus.ACTIVE, label: 'Aktiv' },
  { value: ServiceStatus.PAUSED, label: 'Dayandırılıb' },
  { value: ServiceStatus.ARCHIVED, label: 'Arxiv' },
];

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Qaralama',
  PENDING_REVIEW: 'Yoxlama gözləyir',
  NEEDS_REVISION: 'Düzəliş lazımdır',
  ACTIVE: 'Aktiv',
  PAUSED: 'Dayandırılıb',
  ARCHIVED: 'Arxiv',
};

const STATUS_BADGE: Record<string, 'muted' | 'success' | 'warning' | 'destructive'> = {
  DRAFT: 'muted',
  PENDING_REVIEW: 'warning',
  NEEDS_REVISION: 'destructive',
  ACTIVE: 'success',
  PAUSED: 'warning',
  ARCHIVED: 'destructive',
};

export default function AdminServicesPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>(ServiceStatus.PENDING_REVIEW);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [revisionForId, setRevisionForId] = useState<string | null>(null);
  const [revisionNote, setRevisionNote] = useState('');

  const params: Record<string, string> = { page: String(page), limit: '20' };
  if (search.trim()) params.search = search.trim();
  if (status) params.status = status;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'services', params],
    queryFn: () => api.admin.services(token!, params),
    enabled: !!token,
  });

  const invalidate = async () => {
    setError(null);
    await queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
  };

  const approve = useMutation({
    mutationFn: (id: string) => api.admin.approveService(token!, id),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Təsdiq uğursuz oldu');
    },
  });

  const requestRevision = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.admin.requestServiceRevision(token!, id, { note }),
    onSuccess: async () => {
      setRevisionForId(null);
      setRevisionNote('');
      await invalidate();
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Düzəlişə göndərmə uğursuz oldu');
    },
  });

  const setStatusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: ServiceStatus }) =>
      api.admin.setServiceStatus(token!, id, { status: next }),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Əməliyyat uğursuz oldu');
    },
  });

  const busy =
    approve.isPending || requestRevision.isPending || setStatusMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Xidmətlər</h1>
        <p className="mt-1 text-muted-foreground">
          Yeni elanlar yoxlamaya düşür. Təsdiqləsəniz müştərilərə görünür; düzəlişə
          göndərsəniz xidmət verən qeydi görüb yeniləyir.
        </p>
      </div>

      <Card>
        <CardHeader className="gap-4 space-y-0 p-4 pb-0 sm:p-6 sm:pb-0">
          <CardTitle className="text-base">Filtrlər</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Başlıq və ya xidmət verən"
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
        <CardContent className="p-4 sm:p-6">
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
            {data?.items.map((service) => {
              const actionButtons = (
                <>
                  {(service.status === ServiceStatus.PENDING_REVIEW ||
                    service.status === ServiceStatus.NEEDS_REVISION) && (
                    <Button
                      size="sm"
                      className="min-h-11 w-full"
                      disabled={busy}
                      onClick={() => approve.mutate(service.id)}
                    >
                      Təsdiqlə
                    </Button>
                  )}
                  {(service.status === ServiceStatus.PENDING_REVIEW ||
                    service.status === ServiceStatus.ACTIVE) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11 w-full"
                      disabled={busy}
                      onClick={() => {
                        setRevisionForId(service.id);
                        setRevisionNote('');
                        setError(null);
                      }}
                    >
                      Düzəlişə göndər
                    </Button>
                  )}
                  {service.status === ServiceStatus.ACTIVE && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11 w-full"
                      disabled={busy}
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
                  {service.status === ServiceStatus.PAUSED && (
                    <Button
                      size="sm"
                      className="min-h-11 w-full"
                      disabled={busy}
                      onClick={() => approve.mutate(service.id)}
                    >
                      Yenidən aktiv et
                    </Button>
                  )}
                  {service.status !== ServiceStatus.ARCHIVED && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11 w-full"
                      disabled={busy}
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
                </>
              );

              return (
                <li key={service.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words font-medium">{service.title}</p>
                      <Badge variant={STATUS_BADGE[service.status] ?? 'muted'}>
                        {STATUS_LABEL[service.status] ?? service.status}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {service.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                      <span>{service.categoryName}</span>
                      <span aria-hidden className="text-border">
                        ·
                      </span>
                      <span className="truncate">{service.providerName}</span>
                      <span aria-hidden className="text-border">
                        ·
                      </span>
                      <span>{formatPrice(service.price)}</span>
                    </div>
                    {service.reviewNote ? (
                      <p className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-100">
                        Son düzəliş qeydi: {service.reviewNote}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {actionButtons}
                  </div>

                  {revisionForId === service.id && (
                    <div className="rounded-xl border border-border bg-muted/30 p-3 sm:p-4">
                      <label
                        htmlFor={`revision-note-${service.id}`}
                        className="text-sm font-medium"
                      >
                        Düzəliş qeydi (xidmət verən görəcək)
                      </label>
                      <Textarea
                        id={`revision-note-${service.id}`}
                        className="mt-2 min-h-[96px]"
                        value={revisionNote}
                        onChange={(e) => setRevisionNote(e.target.value)}
                        placeholder="Məsələn: qiymət və təsviri dəqiqləşdirin, daha keyfiyyətli şəkil əlavə edin…"
                        disabled={requestRevision.isPending}
                      />
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:justify-items-stretch md:ml-auto md:max-w-xs">
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-11 w-full"
                          disabled={requestRevision.isPending}
                          onClick={() => {
                            setRevisionForId(null);
                            setRevisionNote('');
                          }}
                        >
                          Ləğv et
                        </Button>
                        <Button
                          type="button"
                          className="min-h-11 w-full"
                          disabled={
                            requestRevision.isPending || revisionNote.trim().length < 5
                          }
                          onClick={() =>
                            requestRevision.mutate({
                              id: service.id,
                              note: revisionNote.trim(),
                            })
                          }
                        >
                          Göndər
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {data && data.totalPages > 1 && (
            <div className="mt-4 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="outline"
                size="sm"
                className="min-h-11 w-full sm:w-auto"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Əvvəlki
              </Button>
              <span className="text-center text-sm text-muted-foreground">
                {page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="min-h-11 w-full sm:w-auto"
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
