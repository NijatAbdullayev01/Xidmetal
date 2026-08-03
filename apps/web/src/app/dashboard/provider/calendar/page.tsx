'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Loader2, Plus, Trash2 } from 'lucide-react';
import {
  AvailabilityOverrideType,
  AvailabilitySlotStatus,
  type WorkingHoursDay,
} from '@xidmetal/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { cn, formatTimeInBaku } from '@/lib/utils';

type CalendarTab = 'hours' | 'overrides';

const DAY_LABELS = [
  'Bazar',
  'Bazar ertəsi',
  'Çərşənbə axşamı',
  'Çərşənbə',
  'Cümə axşamı',
  'Cümə',
  'Şənbə',
] as const;

/** UI sırası: Bazar ertəsindən başlayır */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

interface DayHoursForm {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

function emptyWeekHours(): Record<number, DayHoursForm> {
  return Object.fromEntries(
    Array.from({ length: 7 }, (_, day) => [
      day,
      { enabled: day >= 1 && day <= 5, startTime: '09:00', endTime: '18:00' },
    ]),
  ) as Record<number, DayHoursForm>;
}

function toYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthBounds(year: number, monthIndex: number): { from: string; to: string } {
  const from = toYmd(new Date(year, monthIndex, 1));
  const to = toYmd(new Date(year, monthIndex + 1, 0));
  return { from, to };
}

function hoursFromApi(rows: WorkingHoursDay[]): Record<number, DayHoursForm> {
  const base = emptyWeekHours();
  for (const day of DAY_ORDER) {
    base[day] = { enabled: false, startTime: '09:00', endTime: '18:00' };
  }
  for (const row of rows) {
    if (!row.isActive) continue;
    base[row.dayOfWeek] = {
      enabled: true,
      startTime: row.startTime,
      endTime: row.endTime,
    };
  }
  return base;
}

export default function ProviderCalendarPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<CalendarTab>('hours');
  const [serviceId, setServiceId] = useState('');
  const [weekHours, setWeekHours] = useState<Record<number, DayHoursForm>>(emptyWeekHours);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const today = useMemo(() => toYmd(new Date()), []);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(today);
  const [overrideType, setOverrideType] = useState<AvailabilityOverrideType>(
    AvailabilityOverrideType.AVAILABLE,
  );
  const [overrideStart, setOverrideStart] = useState('10:00');
  const [overrideEnd, setOverrideEnd] = useState('12:00');
  const [fullDay, setFullDay] = useState(false);

  const monthRange = useMemo(() => monthBounds(viewYear, viewMonth), [viewYear, viewMonth]);

  const servicesQuery = useQuery({
    queryKey: ['services', 'mine'],
    queryFn: () => api.myServices(token!, { limit: '50' }),
    enabled: !!token,
  });

  const services = useMemo(
    () => servicesQuery.data?.items ?? [],
    [servicesQuery.data?.items],
  );

  useEffect(() => {
    if (!serviceId && services.length > 0) {
      const first = services[0];
      if (first) setServiceId(first.id);
    }
  }, [serviceId, services]);

  const workingHoursQuery = useQuery({
    queryKey: ['working-hours', serviceId],
    queryFn: () => api.getWorkingHours(token!, serviceId),
    enabled: !!token && !!serviceId,
  });

  useEffect(() => {
    if (workingHoursQuery.data) {
      setWeekHours(hoursFromApi(workingHoursQuery.data));
    }
  }, [workingHoursQuery.data]);

  const overridesQuery = useQuery({
    queryKey: ['availability-overrides', serviceId, monthRange.from, monthRange.to],
    queryFn: () =>
      api.getAvailabilityOverrides(token!, serviceId, monthRange.from, monthRange.to),
    enabled: !!token && !!serviceId && tab === 'overrides',
  });

  const previewQuery = useQuery({
    queryKey: ['availability-preview', serviceId, selectedDate],
    queryFn: () => api.getServiceAvailability(serviceId, selectedDate, selectedDate),
    enabled: !!serviceId && !!selectedDate && tab === 'overrides',
  });

  const saveHoursMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new ApiError('Autentifikasiya tələb olunur', 401);
      const hours = DAY_ORDER.flatMap((day) => {
        const entry = weekHours[day];
        if (!entry?.enabled) return [];
        return [
          {
            dayOfWeek: day,
            startTime: entry.startTime,
            endTime: entry.endTime,
            isActive: true,
          },
        ];
      });
      return api.upsertWorkingHours(token, serviceId, { hours });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['working-hours', serviceId] });
      queryClient.invalidateQueries({ queryKey: ['availability-preview', serviceId] });
      setFormError(null);
      setFormSuccess('İş saatları yadda saxlanıldı');
    },
    onError: (error) => {
      setFormSuccess(null);
      setFormError(error instanceof ApiError ? error.message : 'Saxlanılarkən xəta baş verdi');
    },
  });

  const createOverrideMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new ApiError('Autentifikasiya tələb olunur', 401);
      return api.createAvailabilityOverride(token, serviceId, {
        date: selectedDate,
        type: overrideType,
        startTime: fullDay ? null : overrideStart,
        endTime: fullDay ? null : overrideEnd,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-overrides', serviceId] });
      queryClient.invalidateQueries({ queryKey: ['availability-preview', serviceId] });
      setFormError(null);
      setFormSuccess('Tarix qeydi əlavə olundu');
    },
    onError: (error) => {
      setFormSuccess(null);
      setFormError(error instanceof ApiError ? error.message : 'Əlavə edilərkən xəta baş verdi');
    },
  });

  const deleteOverrideMutation = useMutation({
    mutationFn: (overrideId: string) => {
      if (!token) throw new ApiError('Autentifikasiya tələb olunur', 401);
      return api.deleteAvailabilityOverride(token, serviceId, overrideId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-overrides', serviceId] });
      queryClient.invalidateQueries({ queryKey: ['availability-preview', serviceId] });
      setFormError(null);
      setFormSuccess('Qeyd silindi');
    },
    onError: (error) => {
      setFormSuccess(null);
      setFormError(error instanceof ApiError ? error.message : 'Silinərkən xəta baş verdi');
    },
  });

  const previewDay = previewQuery.data?.[0];
  const selectedOverrides =
    overridesQuery.data?.filter((item) => item.date === selectedDate) ?? [];

  const calendarCells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startPad = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: Array<{ date: string | null; day: number | null }> = [];
    for (let i = 0; i < startPad; i++) cells.push({ date: null, day: null });
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ date: toYmd(new Date(viewYear, viewMonth, day)), day });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const monthLabel = new Intl.DateTimeFormat('az-AZ', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(viewYear, viewMonth, 1));

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Təqvim</h1>
        <p className="mt-1 text-muted-foreground">
          Xidmət üzrə iş saatlarını və boş/bağlı günləri təyin edin.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="calendar-service">Xidmət</Label>
            <Select
              id="calendar-service"
              value={serviceId}
              disabled={servicesQuery.isLoading || services.length === 0}
              onChange={(next) => {
                setServiceId(next);
                setFormError(null);
                setFormSuccess(null);
              }}
              options={
                services.length === 0
                  ? [{ value: '', label: 'Xidmət yoxdur', disabled: true }]
                  : services.map((service) => ({
                      value: service.id,
                      label: service.title,
                    }))
              }
              placeholder="Xidmət seçin"
              searchable={services.length > 8}
              searchPlaceholder="Xidmət axtarın..."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={tab === 'hours' ? 'default' : 'outline'}
              className="min-h-[44px]"
              onClick={() => {
                setTab('hours');
                setFormError(null);
                setFormSuccess(null);
              }}
            >
              İş saatları
            </Button>
            <Button
              type="button"
              variant={tab === 'overrides' ? 'default' : 'outline'}
              className="min-h-[44px]"
              onClick={() => {
                setTab('overrides');
                setFormError(null);
                setFormSuccess(null);
              }}
            >
              Boş / bağlı günlər
            </Button>
          </div>

          {formError && (
            <div
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="rounded-lg border border-brand/40 bg-brand/10 px-4 py-3 text-sm">
              {formSuccess}
            </div>
          )}

          {!serviceId ? (
            <p className="text-sm text-muted-foreground">
              Əvvəlcə xidmət yaradın, sonra təqvimi təyin edin.
            </p>
          ) : tab === 'hours' ? (
            <div className="space-y-4">
              {workingHoursQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Yüklənir...
                </div>
              ) : (
                <div className="space-y-3">
                  {DAY_ORDER.map((day) => {
                    const row = weekHours[day] ?? {
                      enabled: false,
                      startTime: '09:00',
                      endTime: '18:00',
                    };
                    return (
                      <div
                        key={day}
                        className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center"
                      >
                        <label className="flex min-h-[44px] items-center gap-3 sm:w-44">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[var(--brand)]"
                            checked={row.enabled}
                            onChange={(event) =>
                              setWeekHours((prev) => ({
                                ...prev,
                                [day]: {
                                  enabled: event.target.checked,
                                  startTime: prev[day]?.startTime ?? '09:00',
                                  endTime: prev[day]?.endTime ?? '18:00',
                                },
                              }))
                            }
                          />
                          <span className="text-sm font-medium">{DAY_LABELS[day]}</span>
                        </label>
                        <div className="grid flex-1 grid-cols-2 gap-2">
                          <Input
                            type="time"
                            value={row.startTime}
                            disabled={!row.enabled}
                            onChange={(event) =>
                              setWeekHours((prev) => ({
                                ...prev,
                                [day]: {
                                  enabled: prev[day]?.enabled ?? false,
                                  startTime: event.target.value,
                                  endTime: prev[day]?.endTime ?? '18:00',
                                },
                              }))
                            }
                          />
                          <Input
                            type="time"
                            value={row.endTime}
                            disabled={!row.enabled}
                            onChange={(event) =>
                              setWeekHours((prev) => ({
                                ...prev,
                                [day]: {
                                  enabled: prev[day]?.enabled ?? false,
                                  startTime: prev[day]?.startTime ?? '09:00',
                                  endTime: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button
                type="button"
                className="min-h-[44px] w-full sm:w-auto"
                disabled={!serviceId || saveHoursMutation.isPending}
                onClick={() => {
                  setFormSuccess(null);
                  saveHoursMutation.mutate();
                }}
              >
                {saveHoursMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saxlanılır...
                  </>
                ) : (
                  'İş saatlarını saxla'
                )}
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => shiftMonth(-1)}>
                    Əvvəlki
                  </Button>
                  <p className="text-sm font-semibold capitalize">{monthLabel}</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => shiftMonth(1)}>
                    Növbəti
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                  {['Be', 'ÇA', 'Ç', 'CA', 'C', 'Ş', 'B'].map((label) => (
                    <span key={label} className="py-1">
                      {label}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarCells.map((cell, index) => {
                    if (!cell.date) {
                      return <div key={`pad-${index}`} className="aspect-square" />;
                    }
                    const hasOverride = overridesQuery.data?.some((o) => o.date === cell.date);
                    const isSelected = cell.date === selectedDate;
                    const isPast = cell.date < today;
                    return (
                      <button
                        key={cell.date}
                        type="button"
                        disabled={isPast}
                        onClick={() => {
                          setSelectedDate(cell.date!);
                          setFormError(null);
                          setFormSuccess(null);
                        }}
                        className={cn(
                          'aspect-square rounded-lg text-sm transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                          isPast && 'cursor-not-allowed text-muted-foreground/40',
                          !isPast && !isSelected && 'hover:bg-muted',
                          isSelected && 'bg-brand text-brand-foreground',
                          hasOverride && !isSelected && 'ring-1 ring-brand/50',
                        )}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">{selectedDate}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="override-type">Növ</Label>
                      <Select
                        id="override-type"
                        value={overrideType}
                        onChange={(next) =>
                          setOverrideType(next as AvailabilityOverrideType)
                        }
                        options={[
                          {
                            value: AvailabilityOverrideType.AVAILABLE,
                            label: 'Boş vaxt',
                          },
                          {
                            value: AvailabilityOverrideType.BLOCKED,
                            label: 'Bağlı / məşğul',
                          },
                        ]}
                      />
                    </div>
                    <label className="flex min-h-[44px] items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--brand)]"
                        checked={fullDay}
                        onChange={(event) => setFullDay(event.target.checked)}
                      />
                      Tam gün
                    </label>
                    {!fullDay && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label htmlFor="override-start">Başlanğıc</Label>
                          <Input
                            id="override-start"
                            type="time"
                            value={overrideStart}
                            onChange={(event) => setOverrideStart(event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="override-end">Bitmə</Label>
                          <Input
                            id="override-end"
                            type="time"
                            value={overrideEnd}
                            onChange={(event) => setOverrideEnd(event.target.value)}
                          />
                        </div>
                      </div>
                    )}
                    <Button
                      type="button"
                      className="min-h-[44px] w-full"
                      disabled={createOverrideMutation.isPending || selectedDate < today}
                      onClick={() => {
                        setFormSuccess(null);
                        createOverrideMutation.mutate();
                      }}
                    >
                      {createOverrideMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Əlavə et
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Bu günün qeydləri</p>
                  {overridesQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Yüklənir...</p>
                  ) : selectedOverrides.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Qeyd yoxdur</p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedOverrides.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                        >
                          <div className="min-w-0">
                            <Badge
                              variant={
                                item.type === AvailabilityOverrideType.AVAILABLE
                                  ? 'success'
                                  : 'muted'
                              }
                            >
                              {item.type === AvailabilityOverrideType.AVAILABLE ? 'Boş' : 'Bağlı'}
                            </Badge>
                            <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                              {item.startTime && item.endTime
                                ? `${item.startTime} – ${item.endTime}`
                                : 'Tam gün'}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-[44px] shrink-0"
                            disabled={deleteOverrideMutation.isPending}
                            onClick={() => deleteOverrideMutation.mutate(item.id)}
                            aria-label="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Slot önizləmə</p>
                  {previewQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Yüklənir...</p>
                  ) : !previewDay?.hasCalendar ? (
                    <p className="text-sm text-muted-foreground">
                      Bu xidmət üçün hələ təqvim təyin olunmayıb.
                    </p>
                  ) : previewDay.slots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Bu tarixdə slot yoxdur</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                      {previewDay.slots.map((slot) => (
                        <span
                          key={slot.start}
                          className={cn(
                            'rounded-lg px-2 py-2 text-center text-xs font-medium tabular-nums',
                            slot.status === AvailabilitySlotStatus.FREE
                              ? 'bg-brand/15 text-foreground'
                              : 'bg-muted text-muted-foreground line-through',
                          )}
                        >
                          {formatTimeInBaku(slot.start)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
