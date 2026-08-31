import Link from 'next/link';
import { servicePublicPath } from '@xidmetal/shared';

/** Kart klikini dəyişmədən crawlable xidmət URL-ləri — listing HTML-ində. */
export function ServiceIndexLinks({
  services,
}: {
  services: { id: string; title: string; slug?: string }[];
}) {
  if (services.length === 0) return null;

  return (
    <nav aria-label="Xidmət səhifələri" className="mt-10 border-t border-border/60 pt-6">
      <h2 className="text-sm font-semibold text-foreground">Xidmət səhifələri</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Tam məlumat üçün xidmətin səhifəsini açın.
      </p>
      <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {services.map((service) => (
          <li key={service.id} className="min-w-0">
            <Link
              href={servicePublicPath(service)}
              className="line-clamp-2 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              {service.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
