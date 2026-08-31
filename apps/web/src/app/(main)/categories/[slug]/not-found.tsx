import type { Metadata } from 'next';
import Link from 'next/link';
import { FolderSearch } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';
import { NOINDEX } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Kateqoriya tapılmadı',
  robots: NOINDEX,
};

export default function CategoryNotFound() {
  return (
    <section className="flex min-h-[calc(100dvh-3.5rem)] flex-col py-8 pb-[40px] sm:min-h-[calc(100vh-4rem)] sm:py-12 sm:pb-[40px]">
      <div className="mx-auto flex w-full min-h-0 max-w-7xl flex-1 flex-col px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center sm:py-16">
          <div className="relative flex h-16 w-16 items-center justify-center sm:h-[4.5rem] sm:w-[4.5rem]">
            <span
              className="absolute inset-0 rounded-2xl bg-brand/15"
              aria-hidden
            />
            <FolderSearch
              className="relative h-8 w-8 text-foreground/70 sm:h-9 sm:w-9"
              aria-hidden
            />
          </div>

          <h1 className="mt-6 text-lg font-semibold tracking-tight sm:text-xl">
            Kateqoriya tapılmadı
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
            Axtardığınız kateqoriya mövcud deyil və ya silinib. Başqa
            kateqoriyalara baxa bilərsiniz.
          </p>

          <div className="mt-7 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:w-auto sm:flex-row sm:justify-center">
            <Link
              href="/"
              className={
                buttonStyles('default', 'md') +
                ' min-h-11 w-full touch-manipulation sm:w-auto'
              }
            >
              Ana səhifə
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
