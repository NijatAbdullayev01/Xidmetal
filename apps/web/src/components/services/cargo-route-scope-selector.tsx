'use client';

import {
  CargoRouteScope,
  CARGO_ROUTE_SCOPE_LABELS,
  CARGO_ROUTE_SCOPE_DESCRIPTIONS,
} from '@xidmetal/shared';
import { Building2, Route, MapPinned } from 'lucide-react';
import { cn } from '@/lib/utils';

const scopes = [
  {
    value: CargoRouteScope.INTRA_CITY,
    icon: Building2,
  },
  {
    value: CargoRouteScope.INTERCITY,
    icon: Route,
  },
  {
    value: CargoRouteScope.BOTH,
    icon: MapPinned,
  },
] as const;

interface CargoRouteScopeSelectorProps {
  value?: CargoRouteScope;
  onChange: (scope: CargoRouteScope) => void;
  disabled?: boolean;
  error?: boolean;
}

export function CargoRouteScopeSelector({
  value,
  onChange,
  disabled,
  error,
}: CargoRouteScopeSelectorProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3',
        error && 'rounded-xl ring-2 ring-destructive/40 ring-offset-2',
      )}
      role="group"
      aria-label="Daşıma marşrutu"
    >
      {scopes.map((scope) => {
        const Icon = scope.icon;
        const isSelected = value === scope.value;

        return (
          <button
            key={scope.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(scope.value)}
            className={cn(
              'relative flex min-h-[44px] min-w-0 gap-3 rounded-xl border-2 p-3 text-left transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
              'disabled:pointer-events-none disabled:opacity-50',
              'sm:flex-col sm:items-start sm:p-4',
              isSelected
                ? 'border-brand bg-brand/10 shadow-sm'
                : 'border-border bg-card hover:border-brand/40 hover:bg-muted/50',
            )}
            aria-pressed={isSelected}
          >
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors sm:h-10 sm:w-10',
                isSelected ? 'bg-brand text-brand-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 sm:w-full">
              <span className="block text-sm font-semibold leading-tight">
                {CARGO_ROUTE_SCOPE_LABELS[scope.value]}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground sm:mt-1 sm:leading-relaxed">
                {CARGO_ROUTE_SCOPE_DESCRIPTIONS[scope.value]}
              </span>
            </div>
            {isSelected && (
              <span
                className="absolute top-2.5 right-2.5 h-2.5 w-2.5 rounded-full bg-brand sm:top-3 sm:right-3"
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
