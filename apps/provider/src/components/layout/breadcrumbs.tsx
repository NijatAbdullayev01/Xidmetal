import Link from 'next/link';

export type BreadcrumbCrumb = {
  href?: string;
  label: string;
};

export function PageBreadcrumbs({ items }: { items: BreadcrumbCrumb[] }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <Breadcrumbs items={items} />
    </div>
  );
}

export function Breadcrumbs({ items }: { items: BreadcrumbCrumb[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Yol göstərici" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 ? <span aria-hidden>/</span> : null}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="truncate transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'truncate text-foreground' : 'truncate'}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
