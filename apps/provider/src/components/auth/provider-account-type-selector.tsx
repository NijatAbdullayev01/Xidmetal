'use client';

import { Building2, User } from 'lucide-react';
import { PROVIDER_ACCOUNT_TYPE_LABELS, ProviderAccountType } from '@xidmetal/shared';
import { cn } from '@/lib/utils';

const accountTypes = [
  {
    value: ProviderAccountType.INDIVIDUAL,
    label: PROVIDER_ACCOUNT_TYPE_LABELS[ProviderAccountType.INDIVIDUAL],
    description: 'Öz adınızla xidmət təklif etmək üçün',
    icon: User,
  },
  {
    value: ProviderAccountType.COMPANY,
    label: PROVIDER_ACCOUNT_TYPE_LABELS[ProviderAccountType.COMPANY],
    description: 'Şirkət adı ilə xidmət təklif etmək üçün',
    icon: Building2,
  },
] as const;

interface ProviderAccountTypeSelectorProps {
  value: ProviderAccountType;
  onChange: (value: ProviderAccountType) => void;
  disabled?: boolean;
}

export function ProviderAccountTypeSelector({
  value,
  onChange,
  disabled,
}: ProviderAccountTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5">
      {accountTypes.map((accountType) => {
        const Icon = accountType.icon;
        const isSelected = value === accountType.value;

        return (
          <button
            key={accountType.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(accountType.value)}
            className={cn(
              'relative flex min-h-[44px] min-w-0 gap-2.5 rounded-lg border-2 p-2.5 text-left transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40',
              'disabled:pointer-events-none disabled:opacity-50',
              'sm:flex-col sm:items-start sm:p-3',
              isSelected
                ? 'border-brand bg-brand/10 shadow-sm'
                : 'border-border bg-card hover:border-brand/40 hover:bg-muted/50',
            )}
            aria-pressed={isSelected}
          >
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors',
                isSelected ? 'bg-brand text-brand-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 sm:w-full">
              <span className="block text-sm font-semibold leading-tight">{accountType.label}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                {accountType.description}
              </span>
            </div>
            {isSelected && (
              <span
                className="absolute top-2 right-2 h-2 w-2 rounded-full bg-brand"
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
