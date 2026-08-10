import { cn } from '@/lib/utils';

function Pulse({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-muted', className)} />;
}

export function HomeCategoriesSkeleton() {
  return (
    <section className="pt-4 pb-12 sm:pt-6 sm:pb-20" aria-busy aria-label="Yüklənir">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Pulse className="h-7 w-36 sm:h-8" />
        <div className="-mx-4 mt-3 sm:-mx-6 lg:-mx-8">
          <div className="flex gap-3 overflow-hidden px-4 sm:gap-4 sm:px-6 lg:px-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <Pulse
                key={index}
                className="h-[128px] w-[42vw] max-w-[10.25rem] shrink-0 rounded-2xl sm:h-[168px] sm:w-[11.5rem] sm:max-w-none md:w-[12.5rem]"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ServicesPageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8" aria-busy aria-label="Yüklənir">
      <Pulse className="h-9 w-48 sm:h-10" />
      <Pulse className="mt-3 h-5 w-full max-w-xl" />
      <Pulse className="mt-6 h-12 w-full max-w-2xl rounded-xl" />
      <div className="mt-8 flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <Pulse key={index} className="h-24 w-36 shrink-0 rounded-2xl sm:h-28 sm:w-40" />
        ))}
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Pulse key={index} className="h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function CategoryPageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8" aria-busy aria-label="Yüklənir">
      <Pulse className="h-9 w-56 sm:h-10" />
      <Pulse className="mt-3 h-5 w-full max-w-lg" />
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Pulse key={index} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Pulse key={index} className="h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function MainPageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8" aria-busy aria-label="Yüklənir">
      <Pulse className="mx-auto h-10 w-3/4 max-w-2xl sm:h-14" />
      <Pulse className="mx-auto mt-4 h-5 w-full max-w-xl" />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Pulse key={index} className="h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
