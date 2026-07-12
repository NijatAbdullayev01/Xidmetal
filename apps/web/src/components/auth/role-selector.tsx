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
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
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
              <span className="block text-sm font-semibold leading-tight">{role.label}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground sm:mt-1 sm:leading-relaxed">
                {role.description}
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
