import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BreadcrumbCrumb = {
  href?: string;
  label: string;
};

export function PageBreadcrumbs({ items }: { items: BreadcrumbCrumb[] }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-2.5 sm:px-6 lg:px-8">
      <Breadcrumbs items={items} />
    </div>
  );
}

export function Breadcrumbs({ items }: { items: BreadcrumbCrumb[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Yol göstərici" className="mb-2.5 text-sm text-muted-foreground">
      <ol className="flex items-center gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-x-visible md:pb-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isHome = item.href === '/';
          const itemClass = cn(
            'inline-flex min-w-0 items-center gap-1.5 truncate rounded-md px-1.5 py-0.5',
            isLast ? 'font-medium text-foreground' : 'text-muted-foreground',
          );

          return (
            <li
              key={`${item.label}-${index}`}
              className="flex shrink-0 items-center gap-1 md:min-w-0 md:shrink"
            >
              {index > 0 ? (
                <ChevronRight
                  aria-hidden
                  className="h-4 w-4 shrink-0 text-muted-foreground/40"
                />
              ) : null}

              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={cn(
                    itemClass,
                    'transition-colors hover:bg-brand/10 hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
                  )}
                >
                  {isHome ? <Home aria-hidden className="h-3.5 w-3.5 shrink-0" /> : null}
                  <span className="truncate">{item.label}</span>
                </Link>
              ) : (
                <span className={itemClass}>
                  {isHome ? <Home aria-hidden className="h-3.5 w-3.5 shrink-0" /> : null}
                  <span className="truncate">{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
