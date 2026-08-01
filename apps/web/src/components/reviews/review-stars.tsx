import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ReviewStars({
  rating,
  size = 'md',
  className,
}: {
  rating: number;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      aria-label={`${rating} ulduz`}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            iconClass,
            index < rating ? 'fill-brand text-brand' : 'text-muted-foreground/30',
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}
