'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ReportStatus,
  reportReasonLabels,
  type ReportReason,
} from '@xidmetal/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';

const STATUS_OPTIONS = [
  { value: '', label: 'Bütün statuslar' },
  { value: ReportStatus.PENDING, label: 'Gözləyir' },
  { value: ReportStatus.RESOLVED, label: 'Həll olunub' },
  { value: ReportStatus.DISMISSED, label: 'İmtina edilib' },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Gözləyir',
  RESOLVED: 'Həll olunub',
  DISMISSED: 'İmtina edilib',
};

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'destructive' | 'muted'> = {
  PENDING: 'warning',
  RESOLVED: 'success',
  DISMISSED: 'destructive',
};

const TARGET_LABEL: Record<string, string> = {
  USER: 'İstifadəçi',
  SERVICE: 'Xidmət',
  BOOKING: 'Sifariş',
  MESSAGE: 'Mesaj',
  OTHER: 'Digər',
};

export default function AdminReportsPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>(ReportStatus.PENDING);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const params: Record<string, string> = { page: String(page), limit: '20' };
  if (status) params.status = status;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports', params],
    queryFn: () => api.admin.reports(token!, params),
    enabled: !!token,
  });

  const moderate = useMutation({
    mutationFn: ({
      id,
      next,
      adminNote,
    }: {
      id: string;
      next: ReportStatus.RESOLVED | ReportStatus.DISMISSED;
      adminNote?: string;
    }) =>
      api.admin.setReportStatus(token!, id, {
        status: next,
        ...(adminNote ? { adminNote } : {}),
      }),
    onSuccess: async (_data, vars) => {
      setError(null);
      setNotes((prev) => {
        const next = { ...prev };
        delete next[vars.id];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Əməliyyat uğursuz oldu');
    },
  });

  const noteFor = (id: string, existing?: string | null) =>
    notes[id] ?? existing ?? '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Şikayətlər</h1>
        <p className="mt-1 text-muted-foreground">
          İstifadəçi şikayətlərini araşdırın, həll edin və ya əsassız olanları rədd edin.
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
            <p className="py-8 text-center text-sm text-muted-foreground">Şikayət tapılmadı</p>
          )}

          <ul className="divide-y divide-border">
            {data?.items.map((report) => (
              <li key={report.id} className="space-y-3 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    {TARGET_LABEL[report.targetType] ?? report.targetType}
                    {report.targetId ? (
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {report.targetId}
                      </span>
                    ) : null}
                  </p>
                  <Badge variant={STATUS_BADGE[report.status] ?? 'muted'}>
                    {STATUS_LABEL[report.status] ?? report.status}
                  </Badge>
                  <Badge variant="muted">
                    {reportReasonLabels[report.reason as ReportReason] ?? report.reason}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {report.reporterName} &lt;{report.reporterEmail}&gt; ·{' '}
                  {new Date(report.createdAt).toLocaleDateString('az-AZ')}
                </p>
                <p className="text-sm whitespace-pre-wrap">{report.description}</p>
                {report.status === ReportStatus.PENDING ? (
                  <div className="space-y-2">
                    <Label htmlFor={`admin-note-${report.id}`}>Admin qeydi (opsional)</Label>
                    <Textarea
                      id={`admin-note-${report.id}`}
                      value={noteFor(report.id, report.adminNote)}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [report.id]: e.target.value }))
                      }
                      rows={2}
                      maxLength={1000}
                      placeholder="Daxili qeyd…"
                    />
                  </div>
                ) : (
                  report.adminNote && (
                    <p className="text-sm text-muted-foreground">
                      Admin qeydi: {report.adminNote}
                    </p>
                  )
                )}
                <div className="flex flex-wrap gap-2">
                  {report.status !== ReportStatus.RESOLVED && (
                    <Button
                      size="sm"
                      className="min-h-[44px]"
                      disabled={moderate.isPending}
                      onClick={() =>
                        moderate.mutate({
                          id: report.id,
                          next: ReportStatus.RESOLVED,
                          adminNote: noteFor(report.id, report.adminNote).trim() || undefined,
                        })
                      }
                    >
                      Həll olundu
                    </Button>
                  )}
                  {report.status !== ReportStatus.DISMISSED && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[44px]"
                      disabled={moderate.isPending}
                      onClick={() =>
                        moderate.mutate({
                          id: report.id,
                          next: ReportStatus.DISMISSED,
                          adminNote: noteFor(report.id, report.adminNote).trim() || undefined,
                        })
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
