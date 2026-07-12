'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type ThemeToggleProps = {
  className?: string;
  variant?: 'icon' | 'switch';
};

export function ThemeToggle({ className, variant = 'icon' }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';

  if (variant === 'switch') {
    return (
      <div
        role="group"
        aria-label="Tema seçimi"
        className={cn(
          'inline-flex h-9 overflow-hidden rounded-lg border border-border bg-muted/80 p-0.5 shadow-inner',
          className,
        )}
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={cn(
            'flex min-w-9 flex-1 items-center justify-center gap-1 rounded-md px-2 transition-all',
            !isDark
              ? 'bg-card text-brand-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
          aria-label="Gündüz rejimi"
          aria-pressed={!isDark}
          disabled={!mounted}
        >
          <Sun className={cn('h-4 w-4', !isDark && 'text-brand')} />
        </button>
        <div className="w-px shrink-0 self-stretch bg-border" aria-hidden="true" />
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={cn(
            'flex min-w-9 flex-1 items-center justify-center gap-1 rounded-md px-2 transition-all',
            isDark
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
          aria-label="Gecə rejimi"
          aria-pressed={isDark}
          disabled={!mounted}
        >
          <Moon className={cn('h-4 w-4', isDark && 'text-brand')} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        className,
      )}
      aria-label={isDark ? 'Gündüz rejimi' : 'Gecə rejimi'}
      disabled={!mounted}
    >
      {mounted ? (
        isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5 opacity-0" />
      )}
    </button>
  );
}
