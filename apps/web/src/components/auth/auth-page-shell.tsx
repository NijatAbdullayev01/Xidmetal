import { AuthCloseButton } from '@/components/auth/auth-close-button';
import { cn } from '@/lib/utils';

interface AuthPageShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  maxWidth?: 'md' | 'lg';
}

export function AuthPageShell({
  title,
  description,
  children,
  maxWidth = 'lg',
}: AuthPageShellProps) {
  return (
    <section className="flex min-h-0 flex-1 items-center justify-center bg-gradient-to-b from-brand/5 to-background px-4 safe-py-8 sm:px-6 sm:safe-py-10 lg:safe-py-12">
      <div
        className={cn(
          'flex w-full min-h-0 max-h-full flex-col',
          maxWidth === 'md' ? 'max-w-md' : 'max-w-lg',
        )}
      >
        <div className="relative flex min-h-0 max-h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          <AuthCloseButton />

          <div className="shrink-0 px-4 pt-4 pr-10 text-center sm:px-6 sm:pt-6 sm:pr-12 lg:px-8 lg:pt-8">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">{title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-base">{description}</p>
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-4 scrollbar-none sm:mt-6 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
