'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Eye,
  Clock,
  MousePointerClick,
  TrendingDown,
  UserPlus,
  Briefcase,
  ClipboardList,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';

type RangeKey = '7d' | '30d' | '90d';

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function rangeBounds(key: RangeKey): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  const days = key === '7d' ? 6 : key === '90d' ? 89 : 29;
  from.setUTCDate(from.getUTCDate() - days);
  return { from: toYmd(from), to: toYmd(to) };
}

function formatDuration(ms: number): string {
  if (!ms || ms < 1000) return '0 san';
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s} san`;
  if (m < 60) return s > 0 ? `${m} dəq ${s} san` : `${m} dəq`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h} saat ${rem} dəq` : `${h} saat`;
}

function formatPct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

interface MetricCard {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
}

export function AdminAnalyticsPage() {
  const token = useAuthToken();
  const [range, setRange] = useState<RangeKey>('30d');
  const bounds = useMemo(() => rangeBounds(range), [range]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'analytics', bounds.from, bounds.to],
    queryFn: () => api.admin.analytics(token!, bounds),
    enabled: !!token,
    refetchInterval: 60_000,
  });

  const maxPageViews = Math.max(1, ...(data?.timeseries.map((d) => d.pageViews) ?? [1]));
  const maxVisitors = Math.max(1, ...(data?.timeseries.map((d) => d.visitors) ?? [1]));

  const trafficCards: MetricCard[] = [
    {
      label: 'Unikal ziyarətçi',
      value: data?.visitors ?? '—',
      hint: 'Anonymous ID üzrə',
      icon: Users,
    },
    {
      label: 'Sessiyalar',
      value: data?.sessions ?? '—',
      hint: '30 dəq. fasilə = yeni sessiya',
      icon: Eye,
    },
    {
      label: 'Səhifə baxışı',
      value: data?.pageViews ?? '—',
      icon: Eye,
    },
    {
      label: 'Orta müddət',
      value: data ? formatDuration(data.avgDurationMs) : '—',
      hint: 'Sessiya başlanğıcından son aktivliyə',
      icon: Clock,
    },
    {
      label: 'Bounce rate',
      value: data ? formatPct(data.bounceRate) : '—',
      hint: 'Tək səhifəlik sessiyalar',
      icon: TrendingDown,
    },
    {
      label: 'Kliklər',
      value: data?.clicks ?? '—',
      hint: 'Naviqasiya, düymə və data-analytics',
      icon: MousePointerClick,
    },
  ];

  const businessCards: MetricCard[] = [
    {
      label: 'Yeni xidmət alan',
      value: data?.business.newCustomers ?? '—',
      icon: UserPlus,
    },
    {
      label: 'Yeni xidmət verən',
      value: data?.business.newProviders ?? '—',
      icon: Briefcase,
    },
    {
      label: 'Yeni sifariş',
      value: data?.business.newBookings ?? '—',
      icon: ClipboardList,
    },
    {
      label: 'Tamamlanan sifariş',
      value: data?.business.completedBookings ?? '—',
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analitika</h1>
          <p className="mt-1 text-muted-foreground">
            Sayt trafiki, sessiya müddəti, populyar səhifələr və kliklər.
          </p>
        </div>
        <div className="w-full sm:w-48">
          <Select
            id="analytics-range"
            ariaLabel="Tarix aralığı"
            value={range}
            onChange={(v) => setRange(v as RangeKey)}
            options={[
              { value: '7d', label: 'Son 7 gün' },
              { value: '30d', label: 'Son 30 gün' },
              { value: '90d', label: 'Son 90 gün' },
            ]}
          />
        </div>
      </div>

      {isError && (
        <Card className="border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">
            {error instanceof Error ? error.message : 'Analitika yüklənmədi'}
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Trafik</h2>
          <p className="text-xs text-muted-foreground">
            {bounds.from} — {bounds.to}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trafficCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label}>
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/15">
                    <Icon className="h-5 w-5 text-brand-dark" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-2xl font-bold tabular-nums">
                      {isLoading ? '…' : card.value}
                    </p>
                    {card.hint ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{card.hint}</p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Gündəlik dinamika</h2>
          <p className="text-xs text-muted-foreground">Ziyarətçi və səhifə baxışları</p>
        </div>
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-6">
            {isLoading && (
              <p className="text-sm text-muted-foreground">Yüklənir…</p>
            )}
            {!isLoading && (!data || data.timeseries.length === 0) && (
              <p className="text-sm text-muted-foreground">
                Bu aralıqda hələ trafik yoxdur. Marketplace-də səhifə açılanda məlumat
                toplanacaq.
              </p>
            )}
            {data && data.timeseries.length > 0 && (
              <div className="space-y-3">
                {data.timeseries.map((row) => (
                  <div key={row.date} className="grid grid-cols-[4.5rem_1fr] items-center gap-3 sm:grid-cols-[6rem_1fr_auto]">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {row.date.slice(5)}
                    </span>
                    <div className="space-y-1">
                      <div className="h-2 overflow-hidden rounded bg-muted">
                        <div
                          className="h-full rounded bg-brand"
                          style={{ width: `${Math.max(4, (row.pageViews / maxPageViews) * 100)}%` }}
                          title={`Səhifə: ${row.pageViews}`}
                        />
                      </div>
                      <div className="h-1.5 overflow-hidden rounded bg-muted">
                        <div
                          className="h-full rounded bg-brand-dark/70"
                          style={{ width: `${Math.max(4, (row.visitors / maxVisitors) * 100)}%` }}
                          title={`Ziyarətçi: ${row.visitors}`}
                        />
                      </div>
                    </div>
                    <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
                      {row.visitors} / {row.pageViews}
                    </span>
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground">
                  Sarı: səhifə baxışı · Tünd: unikal ziyarətçi · Sağda: ziyarətçi / baxış
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Populyar səhifələr</CardTitle>
            <CardDescription>Ən çox baxılan path-lər</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Yüklənir…</p>
            ) : !data?.topPages.length ? (
              <p className="text-sm text-muted-foreground">Məlumat yoxdur</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[280px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Səhifə</th>
                      <th className="pb-2 text-right font-medium">Baxış</th>
                      <th className="pb-2 text-right font-medium">Sessiya</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPages.map((row) => (
                      <tr key={row.path} className="border-b border-border/60 last:border-0">
                        <td className="max-w-[12rem] truncate py-2.5 font-mono text-xs sm:max-w-none">
                          {row.path}
                        </td>
                        <td className="py-2.5 text-right tabular-nums">{row.views}</td>
                        <td className="py-2.5 text-right tabular-nums">
                          {row.uniqueSessions}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ən çox klik</CardTitle>
            <CardDescription>Naviqasiya, düymə və işarələnmiş CTA-lar</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Yüklənir…</p>
            ) : !data?.topClicks.length ? (
              <p className="text-sm text-muted-foreground">Məlumat yoxdur</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[280px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Element</th>
                      <th className="pb-2 font-medium">Səhifə</th>
                      <th className="pb-2 text-right font-medium">Klik</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topClicks.map((row) => (
                      <tr
                        key={`${row.name}:${row.path ?? ''}`}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="max-w-[10rem] truncate py-2.5 text-xs sm:max-w-[14rem]">
                          {row.name}
                        </td>
                        <td className="max-w-[8rem] truncate py-2.5 font-mono text-xs text-muted-foreground">
                          {row.path ?? '—'}
                        </td>
                        <td className="py-2.5 text-right tabular-nums">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Biznes KPI</h2>
          <p className="text-xs text-muted-foreground">
            Eyni tarix aralığında qeydiyyat və sifarişlər (mövcud DB)
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {businessCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label}>
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/15">
                    <Icon className="h-5 w-5 text-brand-dark" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-2xl font-bold tabular-nums">
                      {isLoading ? '…' : card.value}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
