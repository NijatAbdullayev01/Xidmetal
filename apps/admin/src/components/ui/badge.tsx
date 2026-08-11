import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'muted'
  | 'info'
  | 'transit'
  | 'arrived'
  | 'progress';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-brand/15 text-brand-foreground',
  success: 'bg-success/15 text-success',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  destructive: 'bg-destructive/15 text-destructive',
  muted: 'bg-muted text-muted-foreground',
  info: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  transit: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  arrived: 'bg-teal-500/15 text-teal-700 dark:text-teal-400',
  progress: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
