import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';
import { visiblePageNumbers } from '@/lib/pagination';
import { cn } from '@/lib/utils';

export function PaginationNav({
  page,
  totalPages,
  hrefForPage,
}: {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const numbers = visiblePageNumbers(page, totalPages);

  return (
    <nav
      className="mt-10 flex flex-col items-center justify-between gap-4 sm:flex-row"
      aria-label="Səhifələmə"
    >
      <p className="text-sm text-muted-foreground">
        Səhifə {page} / {totalPages}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <Link
          href={hrefForPage(page - 1)}
          rel={page > 1 ? 'prev' : undefined}
          aria-disabled={page <= 1}
          className={cn(
            buttonStyles('outline', 'md'),
            page <= 1 && 'pointer-events-none opacity-40',
          )}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Əvvəlki
        </Link>
        <ol className="flex items-center gap-1">
          {numbers.map((item, index) =>
            item === 'ellipsis' ? (
              <li
                key={`ellipsis-${index}`}
                className="px-1 text-sm text-muted-foreground"
                aria-hidden
              >
                …
              </li>
            ) : (
              <li key={item}>
                <Link
                  href={hrefForPage(item)}
                  aria-current={item === page ? 'page' : undefined}
                  aria-label={`Səhifə ${item}`}
                  className={cn(
                    'inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-2.5 text-sm font-medium',
                    item === page
                      ? 'bg-brand text-brand-foreground'
                      : 'text-foreground hover:bg-muted',
                  )}
                >
                  {item}
                </Link>
              </li>
            ),
          )}
        </ol>
        <Link
          href={hrefForPage(page + 1)}
          rel={page < totalPages ? 'next' : undefined}
          aria-disabled={page >= totalPages}
          className={cn(
            buttonStyles('outline', 'md'),
            page >= totalPages && 'pointer-events-none opacity-40',
          )}
        >
          Növbəti
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </nav>
  );
}
