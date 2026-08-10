'use client';

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  disabled?: boolean;
};

export type SelectGroup = {
  label: string;
  options: readonly SelectOption[];
};

export interface SelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options?: readonly SelectOption[];
  groups?: readonly SelectGroup[];
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  clearable?: boolean;
  clearLabel?: string;
  emptyLabel?: string;
  /** Trigger sol tərəfində sabit ikon */
  triggerIcon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  /** Panel yuxarısında qısa başlıq */
  panelHeader?: ReactNode;
  size?: 'default' | 'sm';
  align?: 'start' | 'end';
  ariaLabel?: string;
  className?: string;
  triggerClassName?: string;
  panelClassName?: string;
}

type PanelCoords = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: 'bottom' | 'top';
};

const PANEL_GAP = 8;
const VIEWPORT_PAD = 8;
/** Aşağıda bu qədər yer varsa, yuxarı açmağa ehtiyac yoxdur */
const MIN_BOTTOM_SPACE = 160;

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase('az');
}

function flattenGroups(groups: readonly SelectGroup[]): SelectOption[] {
  return groups.flatMap((group) => [...group.options]);
}

function toGroups(
  options: readonly SelectOption[] | undefined,
  groups: readonly SelectGroup[] | undefined,
): SelectGroup[] {
  if (groups && groups.length > 0) return [...groups];
  if (options && options.length > 0) return [{ label: '', options }];
  return [];
}

function filterGroups(groups: readonly SelectGroup[], query: string): SelectGroup[] {
  const normalized = normalizeSearch(query);
  if (!normalized) return [...groups];

  return groups
    .map((group) => ({
      label: group.label,
      options: group.options.filter((option) => {
        const haystack = `${option.label} ${option.description ?? ''}`;
        return normalizeSearch(haystack).includes(normalized);
      }),
    }))
    .filter((group) => group.options.length > 0);
}

function computePanelCoords(
  trigger: DOMRect,
  estimatedHeight: number,
  align: 'start' | 'end',
  preferredWidth: number,
): PanelCoords {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(
    Math.max(preferredWidth, trigger.width),
    viewportWidth - VIEWPORT_PAD * 2,
  );

  let left =
    align === 'end' ? trigger.right - width : trigger.left;
  left = Math.min(
    Math.max(VIEWPORT_PAD, left),
    viewportWidth - width - VIEWPORT_PAD,
  );

  const spaceBelow = viewportHeight - trigger.bottom - PANEL_GAP - VIEWPORT_PAD;
  const spaceAbove = trigger.top - PANEL_GAP - VIEWPORT_PAD;
  // Qısa siyahı üçün də kifayət qədər yer varsa aşağı aç; əks halda daha geniş tərəf
  const placeBottom =
    spaceBelow >= Math.min(estimatedHeight, MIN_BOTTOM_SPACE) ||
    spaceBelow >= spaceAbove;
  const available = placeBottom ? spaceBelow : spaceAbove;
  // maxHeight heç vaxt mövcud yerdən böyük olmamalıdır (əks halda siyahı kəsilir)
  const maxHeight = Math.max(
    Math.min(MIN_BOTTOM_SPACE, available),
    Math.min(estimatedHeight, available),
  );

  if (placeBottom) {
    return {
      top: trigger.bottom + PANEL_GAP,
      left,
      width,
      maxHeight,
      placement: 'bottom',
    };
  }

  // Yuxarı açılışda bottom ilə lövbərlə — real məzmun hündürlüyü top təxminindən asılı olmasın
  return {
    bottom: viewportHeight - trigger.top + PANEL_GAP,
    left,
    width,
    maxHeight,
    placement: 'top',
  };
}

export function Select({
  id,
  value,
  onChange,
  options,
  groups,
  placeholder = 'Seçin',
  disabled = false,
  error = false,
  searchable = false,
  searchPlaceholder = 'Axtarın...',
  clearable = false,
  clearLabel = 'Seçimi sil',
  emptyLabel = 'Nəticə tapılmadı',
  triggerIcon: TriggerIcon,
  panelHeader,
  size = 'default',
  align = 'start',
  ariaLabel,
  className,
  triggerClassName,
  panelClassName,
}: SelectProps) {
  const listboxId = useId();
  const searchId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState<PanelCoords | null>(null);

  const baseGroups = useMemo(() => toGroups(options, groups), [options, groups]);
  const filteredGroups = useMemo(
    () => filterGroups(baseGroups, query),
    [baseGroups, query],
  );
  const flatOptions = useMemo(
    () => flattenGroups(filteredGroups),
    [filteredGroups],
  );

  const selectedOption = useMemo(() => {
    const all = flattenGroups(baseGroups);
    return all.find((option) => option.value === value);
  }, [baseGroups, value]);

  const SelectedIcon = selectedOption?.icon ?? TriggerIcon;

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const preferredWidth =
        size === 'sm' ? Math.max(rect.width, 220) : Math.max(rect.width, 280);
      const estimatedHeight = searchable ? 360 : 320;
      setCoords(computePanelCoords(rect, estimatedHeight, align, preferredWidth));
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, align, size, searchable, flatOptions.length, query]);

  useEffect(() => {
    if (!open) return;

    setQuery('');
    const allOptions = flattenGroups(toGroups(options, groups));
    const selectedIndex = allOptions.findIndex((option) => option.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);

    const focusTimer = window.setTimeout(() => {
      if (searchable) {
        searchRef.current?.focus();
      } else {
        listRef.current
          ?.querySelector<HTMLElement>('[data-select-index][aria-selected="true"]')
          ?.focus();
      }
    }, 0);

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
    // Yalnız açılanda reset — options/groups hər renderdə yeni array ola bilər
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open gate
  }, [open]);

  useEffect(() => {
    if (!open || flatOptions.length === 0) return;
    if (activeIndex >= flatOptions.length) {
      setActiveIndex(0);
      return;
    }
    const active = listRef.current?.querySelector<HTMLElement>(
      `[data-select-index="${activeIndex}"]`,
    );
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open, flatOptions.length]);

  const selectValue = (next: string) => {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const clearValue = () => {
    onChange('');
    setOpen(false);
    triggerRef.current?.focus();
  };

  const moveActive = (delta: number) => {
    if (flatOptions.length === 0) return;
    setActiveIndex((prev) => (prev + delta + flatOptions.length) % flatOptions.length);
  };

  const activateCurrent = () => {
    const current = flatOptions[activeIndex];
    if (!current || current.disabled) return;
    selectValue(current.value);
  };

  const handleListKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(Math.max(0, flatOptions.length - 1));
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activateCurrent();
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'Enter' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      handleListKeyDown(event);
    }
  };

  const isCompact = size === 'sm';
  let optionIndex = -1;

  const panel =
    open &&
    mounted &&
    coords &&
    createPortal(
      <div
        ref={panelRef}
        id={listboxId}
        role="listbox"
        aria-label={ariaLabel ?? placeholder}
        aria-activedescendant={
          flatOptions[activeIndex]
            ? `${listboxId}-option-${activeIndex}`
            : undefined
        }
        className={cn(
          // Modal (z-[100]) üzərində görünməsi üçün — portal body-dədir
          'fixed z-[110] flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg',
          coords.placement === 'top' ? 'origin-bottom' : 'origin-top',
          'motion-safe:animate-[picker-in_160ms_ease-out]',
          panelClassName,
        )}
        style={{
          top: coords.top,
          bottom: coords.bottom,
          left: coords.left,
          width: coords.width,
          maxHeight: coords.maxHeight,
        }}
        onKeyDown={handleListKeyDown}
      >
        {panelHeader ? (
          <div className="hidden shrink-0 border-b border-border/70 bg-muted/40 px-3.5 py-2.5 sm:block">
            {typeof panelHeader === 'string' ? (
              <p className="text-xs font-medium text-muted-foreground">{panelHeader}</p>
            ) : (
              panelHeader
            )}
          </div>
        ) : null}

        {searchable ? (
          <div className="shrink-0 border-b border-border/70 bg-muted/30 p-2.5 sm:p-3">
            <label htmlFor={searchId} className="sr-only">
              Axtarış
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                ref={searchRef}
                id={searchId}
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                autoComplete="off"
                className={cn(
                  'flex h-10 w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm',
                  'placeholder:text-muted-foreground',
                  'focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40',
                )}
              />
            </div>
          </div>
        ) : null}

        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 sm:p-2"
        >
          {clearable ? (
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={clearValue}
              className={cn(
                'mb-1 flex w-full min-h-11 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset',
                !value
                  ? 'bg-brand/15 font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                <X className="h-3.5 w-3.5" aria-hidden />
              </span>
              {clearLabel}
            </button>
          ) : null}

          {flatOptions.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {emptyLabel}
            </p>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.label || 'default'} className="mb-1.5 last:mb-0">
                {group.label ? (
                  <div className="sticky top-0 z-10 bg-card/95 px-3 py-1.5 backdrop-blur-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </p>
                  </div>
                ) : null}
                <div className="space-y-0.5">
                  {group.options.map((option) => {
                    optionIndex += 1;
                    const index = optionIndex;
                    const isSelected = value === option.value;
                    const isActive = index === activeIndex;
                        const Icon = option.icon;
                        const showDescription = Boolean(option.description);

                        return (
                          <button
                            key={option.value}
                            id={`${listboxId}-option-${index}`}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            aria-disabled={option.disabled || undefined}
                            data-select-index={index}
                            disabled={option.disabled}
                            tabIndex={isActive ? 0 : -1}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => {
                              if (!option.disabled) selectValue(option.value);
                            }}
                            className={cn(
                              'flex w-full min-h-11 touch-manipulation items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset',
                              'disabled:cursor-not-allowed disabled:opacity-40',
                              isSelected && 'bg-brand/15 font-medium text-foreground',
                              !isSelected && isActive && 'bg-muted',
                              !isSelected && !isActive && 'hover:bg-muted/70',
                            )}
                          >
                            {Icon ? (
                              <span
                                className={cn(
                                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md sm:h-8 sm:w-8',
                                  isSelected
                                    ? 'bg-brand text-brand-foreground'
                                    : 'bg-muted text-muted-foreground',
                                )}
                                aria-hidden
                              >
                                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </span>
                            ) : null}

                            <span className="min-w-0 flex-1">
                              <span className="block break-words whitespace-normal">
                                {option.label}
                              </span>
                              {showDescription ? (
                                <span className="mt-0.5 block break-words whitespace-normal text-xs leading-snug text-muted-foreground">
                                  {option.description}
                                </span>
                              ) : null}
                            </span>

                            {isSelected ? (
                              <Check
                                className="h-4 w-4 shrink-0 text-brand-dark"
                                aria-hidden
                              />
                            ) : null}
                          </button>
                        );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>,
      document.body,
    );

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex w-full items-center gap-1 rounded-xl border bg-background transition-colors',
          isCompact ? 'h-10 rounded-lg pr-0.5' : 'h-11 pr-1',
          error ? 'border-destructive' : 'border-border',
          open
            ? 'border-brand ring-2 ring-brand/30'
            : 'hover:border-border/80 hover:bg-muted/30',
          disabled && 'opacity-50',
        )}
      >
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-label={ariaLabel}
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2.5 rounded-[inherit] px-3 text-sm',
            'touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset',
            'disabled:cursor-not-allowed',
            isCompact ? 'min-h-10 gap-2 px-2.5 text-xs sm:text-sm' : 'min-h-11',
            !selectedOption && 'text-muted-foreground',
            triggerClassName,
          )}
        >
          {SelectedIcon || TriggerIcon ? (
            <span
              className={cn(
                'flex shrink-0 items-center justify-center rounded-lg',
                isCompact ? 'h-7 w-7 rounded-md' : 'h-8 w-8',
                selectedOption
                  ? 'bg-brand/20 text-brand-dark'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {SelectedIcon ? (
                <SelectedIcon
                  className={cn(isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4')}
                  aria-hidden
                />
              ) : TriggerIcon ? (
                <TriggerIcon
                  className={cn(isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4')}
                  aria-hidden
                />
              ) : null}
            </span>
          ) : null}
          <span className="min-w-0 flex-1 truncate text-left font-medium">
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </button>

        {clearable && value ? (
          <button
            type="button"
            disabled={disabled}
            aria-label={clearLabel}
            onClick={clearValue}
            className={cn(
              'inline-flex shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors',
              'hover:bg-muted hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
              'disabled:cursor-not-allowed',
              isCompact ? 'h-8 w-8' : 'h-9 w-9',
            )}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {panel}
    </div>
  );
}
