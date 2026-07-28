'use client';

import { UserRole } from '@xidmetal/shared';
import { Briefcase, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const roles = [
  {
    value: UserRole.CUSTOMER,
    label: 'İstifadəçi',
    description: 'Xidmət sifariş etmək və provider tapmaq üçün',
    icon: User,
  },
  {
    value: UserRole.PROVIDER,
    label: 'Xidmət verən',
    description: 'Xidmət təklif etmək və müştəri tapmaq üçün',
    icon: Briefcase,
  },
] as const;

interface RoleSelectorProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
}

export function RoleSelector({ value, onChange, disabled }: RoleSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5">
      {roles.map((role) => {
        const Icon = role.icon;
        const isSelected = value === role.value;

        return (
          <button
            key={role.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(role.value)}
            className={cn(
              'relative flex min-h-[44px] min-w-0 gap-2.5 rounded-lg border-2 p-2.5 text-left transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
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
              <span className="block text-sm font-semibold leading-tight">{role.label}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                {role.description}
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
