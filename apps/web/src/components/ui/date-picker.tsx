'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

const WEEKDAY_LABELS = ['Be', 'Ça', 'Ç', 'Ca', 'C', 'Ş', 'B'] as const;

const MONTH_LABELS = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'İyun',
  'İyul',
  'Avqust',
  'Sentyabr',
  'Oktyabr',
  'Noyabr',
  'Dekabr',
] as const;

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parts = value.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildMonthCells(year: number, month: number): Array<Date | null> {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const cells: Array<Date | null> = Array.from({ length: mondayOffset }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export interface DatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  disabled?: boolean;
  error?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({
  id,
  value,
  onChange,
  min,
  disabled = false,
  error = false,
  open,
  onOpenChange,
  placeholder = 'Tarix seçin',
  className,
}: DatePickerProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => startOfDay(new Date()), []);
  const minDate = useMemo(() => {
    const parsed = min ? parseDateKey(min) : null;
    return parsed ? startOfDay(parsed) : today;
  }, [min, today]);

  const selectedDate = useMemo(() => parseDateKey(value), [value]);
  const [viewYear, setViewYear] = useState(
    () => selectedDate?.getFullYear() ?? today.getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(
    () => selectedDate?.getMonth() ?? today.getMonth(),
  );

  useEffect(() => {
    if (!open) return;
    const next = selectedDate ?? today;
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }, [open, selectedDate, today]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        onOpenChange(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open, onOpenChange]);

  const cells = useMemo(() => buildMonthCells(viewYear, viewMonth), [viewYear, viewMonth]);

  const canGoPrev = useMemo(() => {
    const prevMonthEnd = new Date(viewYear, viewMonth, 0);
    return prevMonthEnd >= minDate;
  }, [viewYear, viewMonth, minDate]);

  const goPrevMonth = () => {
    if (!canGoPrev) return;
    if (viewMonth === 0) {
      setViewYear((year) => year - 1);
      setViewMonth(11);
      return;
    }
    setViewMonth((month) => month - 1);
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((year) => year + 1);
      setViewMonth(0);
      return;
    }
    setViewMonth((month) => month + 1);
  };

  const handleSelect = (date: Date) => {
    if (startOfDay(date) < minDate) return;
    onChange(toDateKey(date));
    onOpenChange(false);
  };

  const displayLabel = value ? formatDate(value) : placeholder;

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => onOpenChange(!open)}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-lg border bg-background px-3 text-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-destructive' : 'border-border',
          open && 'border-brand ring-2 ring-brand/30',
          !selectedDate && 'text-muted-foreground',
        )}
      >
        <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left capitalize">{displayLabel}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="dialog"
          aria-label="Tarix seçimi"
          className={cn(
            'mt-2 origin-top rounded-xl border border-border bg-card p-3 shadow-lg',
            'motion-safe:animate-[picker-in_160ms_ease-out]',
          )}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={goPrevMonth}
              disabled={!canGoPrev}
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors',
                'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                'disabled:pointer-events-none disabled:opacity-30',
              )}
              aria-label="Əvvəlki ay"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold tracking-tight">
              {MONTH_LABELS[viewMonth]} {viewYear}
            </p>
            <button
              type="button"
              onClick={goNextMonth}
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors',
                'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
              )}
              aria-label="Növbəti ay"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="flex h-8 items-center justify-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="h-10" />;
              }

              const key = toDateKey(date);
              const isDisabled = startOfDay(date) < minDate;
              const isSelected = value === key;
              const isToday = toDateKey(today) === key;

              return (
                <button
                  key={key}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelect(date)}
                  aria-label={formatDate(key)}
                  aria-pressed={isSelected}
                  className={cn(
                    'relative flex h-10 items-center justify-center rounded-lg text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
                    isDisabled && 'cursor-not-allowed text-muted-foreground/40',
                    !isDisabled && !isSelected && 'hover:bg-muted',
                    isSelected && 'bg-brand text-brand-foreground shadow-sm',
                    !isSelected && isToday && 'ring-1 ring-brand/60',
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
