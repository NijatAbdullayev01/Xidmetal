import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { buttonStyles } from '@/components/ui/button';
import { NOINDEX } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Səhifə tapılmadı',
  robots: NOINDEX,
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Səhifə tapılmadı
        </h1>
        <p className="text-sm text-muted-foreground">
          Axtardığınız ünvan mövcud deyil və ya köçürülüb.
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className={buttonStyles('default', 'md')}>
            Ana səhifə
          </Link>
          <Link href="/services" className={buttonStyles('outline', 'md')}>
            Xidmətlərə bax
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
