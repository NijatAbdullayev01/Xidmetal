'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  formatProviderDisplayName,
  KycDocumentStatus,
  KYC_DOCUMENT_STATUS_LABELS,
  KYC_DOCUMENT_TYPE_LABELS,
  KycDocumentType,
  PROVIDER_ACCOUNT_TYPE_LABELS,
  ProviderAccountType,
  UserRole,
} from '@xidmetal/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';

export function AdminProvidersPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [kycUserId, setKycUserId] = useState<string | null>(null);
  const [kycNotes, setKycNotes] = useState<Record<string, string>>({});

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

  const { data: kycDocs, isLoading: kycLoading } = useQuery({
    queryKey: ['admin', 'providers', kycUserId, 'kyc'],
    queryFn: () => api.admin.providerKyc(token!, kycUserId!),
    enabled: !!token && !!kycUserId,
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

  const setKyc = useMutation({
    mutationFn: ({
      id,
      status,
      adminNote,
    }: {
      id: string;
      status: KycDocumentStatus.APPROVED | KycDocumentStatus.REJECTED;
      adminNote?: string;
    }) => api.admin.setKycStatus(token!, id, { status, adminNote }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'providers'] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'KYC yoxlanışı uğursuz oldu');
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
            placeholder="Ad, soyad, e-poçt və ya telefon"
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
                  className="flex flex-col gap-3 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{formatProviderDisplayName(user)}</p>
                      {user.providerProfile?.accountType && (
                        <Badge variant="muted">
                          {PROVIDER_ACCOUNT_TYPE_LABELS[user.providerProfile.accountType]}
                        </Badge>
                      )}
                      <Badge variant={verified ? 'success' : 'warning'}>
                        {verified ? 'Təsdiqlənib' : 'Gözləyir'}
                      </Badge>
                      {!user.isActive && <Badge variant="destructive">Deaktiv</Badge>}
                    </div>
                    {user.providerProfile?.accountType === ProviderAccountType.COMPANY && (
                      <p className="text-sm text-muted-foreground">
                        {user.firstName} {user.lastName}
                      </p>
                    )}
                    <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                    {user.phone ? (
                      <p className="text-sm text-muted-foreground">
                        <a href={`tel:${user.phone}`} className="hover:text-foreground">
                          {user.phone}
                        </a>
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {user.providerProfile?.location ?? 'Ünvan yoxdur'} · Reytinq{' '}
                      {(user.providerProfile?.rating ?? 0).toFixed(1)} (
                      {user.providerProfile?.reviewCount ?? 0}) ·{' '}
                      {user._count?.services ?? 0} xidmət
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                  <Button
                    variant={verified ? 'outline' : 'default'}
                    size="sm"
                    className="min-h-[44px] shrink-0"
                    disabled={verify.isPending}
                    onClick={() => verify.mutate({ userId: user.id, next: !verified })}
                  >
                    {verified ? 'Təsdiqi ləğv et' : 'Təsdiqlə'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] shrink-0"
                    onClick={() => setKycUserId((prev) => (prev === user.id ? null : user.id))}
                  >
                    {kycUserId === user.id ? 'Sənədləri gizlət' : 'KYC sənədləri'}
                  </Button>
                  </div>
                  </div>
                {kycUserId === user.id && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    {kycLoading && (
                      <p className="text-sm text-muted-foreground">Sənədlər yüklənir…</p>
                    )}
                    {!kycLoading && (kycDocs?.length ?? 0) === 0 && (
                      <p className="text-sm text-muted-foreground">KYC sənədi yoxdur</p>
                    )}
                    <ul className="space-y-3">
                      {kycDocs?.map((doc) => (
                        <li key={doc.id} className="space-y-2 rounded-md bg-background p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">
                              {KYC_DOCUMENT_TYPE_LABELS[doc.type as KycDocumentType] ?? doc.type}
                            </p>
                            <Badge
                              variant={
                                doc.status === KycDocumentStatus.APPROVED
                                  ? 'success'
                                  : doc.status === KycDocumentStatus.REJECTED
                                    ? 'destructive'
                                    : 'warning'
                              }
                            >
                              {KYC_DOCUMENT_STATUS_LABELS[doc.status as KycDocumentStatus] ??
                                doc.status}
                            </Badge>
                          </div>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={doc.url}
                            alt=""
                            className="max-h-40 w-auto rounded-md border border-border object-cover"
                          />
                          {doc.status === KycDocumentStatus.PENDING && (
                            <div className="space-y-2">
                              <Textarea
                                placeholder="Rədd qeydi (istəyə bağlı)"
                                value={kycNotes[doc.id] ?? ''}
                                onChange={(e) =>
                                  setKycNotes((prev) => ({ ...prev, [doc.id]: e.target.value }))
                                }
                              />
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  className="min-h-[44px]"
                                  disabled={setKyc.isPending}
                                  onClick={() =>
                                    setKyc.mutate({ id: doc.id, status: KycDocumentStatus.APPROVED })
                                  }
                                >
                                  Təsdiqlə
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="min-h-[44px]"
                                  disabled={setKyc.isPending}
                                  onClick={() =>
                                    setKyc.mutate({
                                      id: doc.id,
                                      status: KycDocumentStatus.REJECTED,
                                      adminNote: kycNotes[doc.id]?.trim() || undefined,
                                    })
                                  }
                                >
                                  Rədd et
                                </Button>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
