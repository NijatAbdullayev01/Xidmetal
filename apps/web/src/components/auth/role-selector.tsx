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
    <div className="grid gap-3 sm:grid-cols-2">
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
              'relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
              'disabled:pointer-events-none disabled:opacity-50',
              isSelected
                ? 'border-brand bg-brand/10 shadow-sm'
                : 'border-border bg-card hover:border-brand/40 hover:bg-muted/50',
            )}
            aria-pressed={isSelected}
          >
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                isSelected ? 'bg-brand text-brand-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <span className="mt-3 text-sm font-semibold">{role.label}</span>
            <span className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {role.description}
            </span>
            {isSelected && (
              <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-brand" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}
