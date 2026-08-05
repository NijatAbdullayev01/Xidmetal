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
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');
  const label = isDark ? 'Gündüz rejimi' : 'Gecə rejimi';

  if (variant === 'switch') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/80 text-muted-foreground shadow-inner transition-colors hover:bg-muted hover:text-foreground',
          className,
        )}
        aria-label={label}
        disabled={!mounted}
      >
        {mounted ? (
          isDark ? <Sun className="h-4 w-4 text-brand" /> : <Moon className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4 opacity-0" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        className,
      )}
      aria-label={label}
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
