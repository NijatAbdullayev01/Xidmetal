'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import type { AdminCommissionSummary } from '@xidmetal/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { adminListQueryOptions, refreshAdminQueries } from '@/lib/admin-queries';

function formatAzm(amount: number): string {
  const formatted = new Intl.NumberFormat('az-AZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${amount < 0 ? '-' : ''}${formatted} AZN`;
}

export function AdminCommissionPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const params: Record<string, string> = { page: String(page), limit: '20' };
  if (search.trim()) params.search = search.trim();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'commission', params],
    queryFn: () => api.admin.commission(token!, params),
    enabled: !!token,
    ...adminListQueryOptions,
  });

  const adjust = useMutation({
    mutationFn: ({
      userId,
      amount: value,
      note: text,
    }: {
      userId: string;
      amount: number;
      note?: string;
    }) =>
      api.admin.adjustCommission(token!, userId, {
        amount: value,
        ...(text?.trim() ? { note: text.trim() } : {}),
      }),
    onSuccess: async () => {
      setError(null);
      setOpenUserId(null);
      setAmount('');
      setNote('');
      await refreshAdminQueries(queryClient, ['admin', 'commission']);
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Əməliyyat uğursuz oldu');
    },
  });

  const handleAdjust = (row: AdminCommissionSummary) => {
    setError(null);
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Müsbət məbləğ daxil edin');
      return;
    }
    adjust.mutate({ userId: row.providerId, amount: parsed, note });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Komissiya və borc</h1>
        <p className="mt-1 text-muted-foreground">
          Xidmət verənlərin komissiya borcunu izləyin və köçürmə ilə ödənişləri qeyd edin.
        </p>
      </div>

      <Card>
        <CardHeader className="gap-4 space-y-0">
          <CardTitle className="text-base">Axtarış</CardTitle>
          <Input
            placeholder="Ad, soyad, e-poçt və ya hesab nömrəsi"
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
            {data?.items.map((row) => (
              <li key={row.providerId} className="py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{row.providerName}</p>
                      {row.suspended ? (
                        <Badge variant="destructive">Bağlıdır</Badge>
                      ) : row.debt > 0 ? (
                        <Badge variant="warning">Borc var</Badge>
                      ) : (
                        <Badge variant="success">Təmiz</Badge>
                      )}
                      {!row.isActive && <Badge variant="muted">Deaktiv</Badge>}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{row.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Hesab: <span className="font-mono">{row.accountNumber}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Komissiya cəmi: {formatAzm(row.totalCommissionCharged)} · Top-up:{' '}
                      {formatAzm(row.totalDeposits)}
                      {row.debtDueAt
                        ? ` · Son tarix: ${new Date(row.debtDueAt).toLocaleString('az-AZ')}`
                        : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-lg font-bold tabular-nums ${
                        row.debt > 0 ? 'text-destructive' : 'text-success'
                      }`}
                    >
                      {row.debt > 0 ? `-${formatAzm(row.debt)}` : '0.00 AZN'}
                    </p>
                    <Button
                      variant={row.debt > 0 ? 'default' : 'outline'}
                      size="sm"
                      className="mt-1 min-h-[44px]"
                      onClick={() =>
                        setOpenUserId(openUserId === row.providerId ? null : row.providerId)
                      }
                    >
                      Ödəniş qeyd et
                    </Button>
                  </div>
                </div>

                {openUserId === row.providerId && (
                  <div className="mt-3 space-y-3 rounded-lg border border-border p-3">
                    <p className="text-sm text-muted-foreground">
                      Köçürmə ilə daxil olan məbləği qeyd edin — borc bu qədər azalacaq.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor={`amount-${row.providerId}`}>Məbləğ (AZN)</Label>
                        <Input
                          id={`amount-${row.providerId}`}
                          type="number"
                          inputMode="decimal"
                          min="0.01"
                          step="0.01"
                          placeholder="15"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`note-${row.providerId}`}>Qeyd (opsional)</Label>
                        <Textarea
                          id={`note-${row.providerId}`}
                          placeholder="Köçürmə nömrəsi / tarix"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          className="min-h-[44px]"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="min-h-[44px]"
                        disabled={adjust.isPending}
                        onClick={() => handleAdjust(row)}
                      >
                        {adjust.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        Təsdiqlə
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-[44px]"
                        onClick={() => setOpenUserId(null)}
                      >
                        Ləğv et
                      </Button>
                    </div>
                  </div>
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
