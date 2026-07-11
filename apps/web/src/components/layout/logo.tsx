import Image from 'next/image';
import { cn } from '@/lib/utils';

const LOGO_WIDTH = 243;
const LOGO_HEIGHT = 96;

interface LogoProps {
  className?: string;
  priority?: boolean;
  variant?: 'brand' | 'transparent';
}

export function Logo({ className, priority = false, variant = 'brand' }: LogoProps) {
  const src = variant === 'transparent' ? '/logo-transparent.png' : '/logo.png';

  return (
    <Image
      src={src}
      alt="Xidmetal"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      quality={100}
      sizes="(max-width: 768px) 120px, 130px"
      className={cn(
        'block h-12 w-auto',
        variant === 'transparent' && 'dark:brightness-0 dark:invert',
        className,
      )}
      priority={priority}
    />
  );
}
