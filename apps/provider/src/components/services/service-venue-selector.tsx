'use client';

import { ServiceVenue, SERVICE_VENUE_LABELS, SERVICE_VENUE_DESCRIPTIONS } from '@xidmetal/shared';
import { MapPin, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

const venues = [
  {
    value: ServiceVenue.AT_LOCATION,
    icon: MapPin,
  },
  {
    value: ServiceVenue.AT_SALON,
    icon: Store,
  },
] as const;

interface ServiceVenueSelectorProps {
  value?: ServiceVenue;
  onChange: (venue: ServiceVenue) => void;
  disabled?: boolean;
  error?: boolean;
}

export function ServiceVenueSelector({
  value,
  onChange,
  disabled,
  error,
}: ServiceVenueSelectorProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3',
        error && 'rounded-xl ring-2 ring-destructive/40 ring-offset-2',
      )}
      role="group"
      aria-label="Xidmət yeri"
    >
      {venues.map((venue) => {
        const Icon = venue.icon;
        const isSelected = value === venue.value;

        return (
          <button
            key={venue.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(venue.value)}
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
                {SERVICE_VENUE_LABELS[venue.value]}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground sm:mt-1 sm:leading-relaxed">
                {SERVICE_VENUE_DESCRIPTIONS[venue.value]}
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
