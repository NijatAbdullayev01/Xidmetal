'use client';

import { useEffect, useId, useMemo, useRef } from 'react';
import { ChevronDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_START_MINUTES = 8 * 60;
const DEFAULT_END_MINUTES = 21 * 60;
const SLOT_STEP_MINUTES = 30;

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function timeToMinutes(value: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const parts = value.split(':');
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

function buildTimeSlots(startMinutes: number, endMinutes: number, step: number): string[] {
  const slots: string[] = [];
  for (let minutes = startMinutes; minutes <= endMinutes; minutes += step) {
    slots.push(minutesToTime(minutes));
  }
  return slots;
}

function formatTimeLabel(value: string): string {
  return value;
}

export interface TimePickerOption {
  value: string;
  label?: string;
  disabled?: boolean;
  hint?: string;
}

export interface TimePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Bu vaxtdan əvvəlki slotlar deaktiv (HH:mm) */
  minTime?: string;
  disabled?: boolean;
  error?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder?: string;
  className?: string;
  /** Verilərsə default 08–21 grid əvəzinə bu siyahı göstərilir */
  options?: TimePickerOption[];
  emptyMessage?: string;
  helperText?: string;
}

export function TimePicker({
  id,
  value,
  onChange,
  minTime,
  disabled = false,
  error = false,
  open,
  onOpenChange,
  placeholder = 'Saat seçin',
  className,
  options,
  emptyMessage = 'Boş vaxt yoxdur',
  helperText,
}: TimePickerProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const defaultSlots = useMemo(
    () => buildTimeSlots(DEFAULT_START_MINUTES, DEFAULT_END_MINUTES, SLOT_STEP_MINUTES),
    [],
  );

  const resolvedOptions: TimePickerOption[] = useMemo(() => {
    if (options) return options;
    return defaultSlots.map((slot) => ({ value: slot }));
  }, [options, defaultSlots]);

  const minMinutes = useMemo(() => {
    if (!minTime) return null;
    return timeToMinutes(minTime);
  }, [minTime]);

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

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      selectedRef.current?.scrollIntoView({ block: 'nearest' });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, value]);

  const handleSelect = (slot: TimePickerOption) => {
    if (slot.disabled) return;
    if (minMinutes !== null) {
      const slotMinutes = timeToMinutes(slot.value);
      if (slotMinutes !== null && slotMinutes < minMinutes) return;
    }
    onChange(slot.value);
    onOpenChange(false);
  };

  const selectedOption = resolvedOptions.find((slot) => slot.value === value);
  const displayLabel = selectedOption
    ? (selectedOption.label ?? formatTimeLabel(selectedOption.value))
    : value
      ? formatTimeLabel(value)
      : placeholder;

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => onOpenChange(!open)}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-lg border bg-background px-3 text-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-destructive' : 'border-border',
          open && 'border-brand ring-2 ring-brand/30',
          !value && 'text-muted-foreground',
        )}
      >
        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left tabular-nums">{displayLabel}</span>
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
          role="listbox"
          aria-label="Saat seçimi"
          className={cn(
            'mt-2 origin-top overflow-hidden rounded-xl border border-border bg-card shadow-lg',
            'motion-safe:animate-[picker-in_160ms_ease-out]',
          )}
        >
          <div className="border-b border-border/70 px-3 py-2.5">
            <p className="text-xs font-medium text-muted-foreground">
              {helperText ??
                (options ? 'Mövcud vaxtlar' : '30 dəqiqəlik interval · 08:00–21:00')}
            </p>
          </div>
          <div className="max-h-56 overflow-y-auto overscroll-contain p-2">
            {resolvedOptions.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                {resolvedOptions.map((slot) => {
                  const slotMinutes = timeToMinutes(slot.value) ?? 0;
                  const isPastMin = minMinutes !== null && slotMinutes < minMinutes;
                  const isDisabled = Boolean(slot.disabled) || isPastMin;
                  const isSelected = value === slot.value;

                  return (
                    <button
                      key={slot.value}
                      ref={isSelected ? selectedRef : undefined}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={isDisabled}
                      onClick={() => handleSelect(slot)}
                      className={cn(
                        'flex h-10 flex-col items-center justify-center rounded-lg text-sm font-medium tabular-nums transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
                        isDisabled && 'cursor-not-allowed text-muted-foreground/35',
                        !isDisabled && !isSelected && 'hover:bg-muted',
                        isSelected && 'bg-brand text-brand-foreground shadow-sm',
                        slot.disabled && !isSelected && 'line-through',
                      )}
                    >
                      <span>{slot.label ?? slot.value}</span>
                      {slot.hint ? (
                        <span className="text-[10px] font-normal opacity-80">{slot.hint}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Bu gün üçün növbəti əlçatan 30 dəq slot (HH:mm) */
export function getNextAvailableTimeSlot(from: Date = new Date()): string {
  const total = from.getHours() * 60 + from.getMinutes() + 1;
  const next = Math.ceil(total / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES;
  if (next > DEFAULT_END_MINUTES) {
    return minutesToTime(DEFAULT_END_MINUTES + SLOT_STEP_MINUTES);
  }
  return minutesToTime(Math.max(next, DEFAULT_START_MINUTES));
}
