'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';

const ACTION_LABELS: Record<string, string> = {
  USER_ACTIVE: 'İstifadəçi aktivliyi',
  PROVIDER_VERIFY: 'Xidmət verən təsdiqi',
  KYC_REVIEW: 'KYC yoxlanışı',
  CONTACT_READ: 'Əlaqə mesajı oxundu',
};

export function AdminAuditPage() {
  const token = useAuthToken();
  const [page, setPage] = useState(1);

  const params = { page: String(page), limit: '30' };
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit', params],
    queryFn: () => api.admin.audit(token!, params),
    enabled: !!token,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit jurnalı</h1>
        <p className="mt-1 text-muted-foreground">
          Admin əməliyyatlarının izi: təsdiq, KYC, bloklama.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Son əməliyyatlar</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">Yüklənir…</p>
          )}
          {!isLoading && data?.items.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Qeyd yoxdur</p>
          )}
          <ul className="divide-y divide-border">
            {data?.items.map((row) => (
              <li key={row.id} className="space-y-1 py-3">
                <p className="text-sm font-medium">
                  {ACTION_LABELS[row.action] ?? row.action}
                </p>
                <p className="text-sm text-muted-foreground">
                  {row.adminName} · {row.targetType}
                  {row.targetId ? ` · ${row.targetId.slice(0, 8)}…` : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(row.createdAt).toLocaleString('az-AZ')}
                </p>
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
