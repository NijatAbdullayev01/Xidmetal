import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonStyles } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Səhifə tapılmadı',
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Səhifə tapılmadı
      </h1>
      <p className="text-sm text-muted-foreground">
        Axtardığınız ünvan mövcud deyil və ya köçürülüb.
      </p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <Link href="/dashboard/provider" className={buttonStyles('default', 'md')}>
          Kabinetə qayıt
        </Link>
        <Link href="/login" className={buttonStyles('outline', 'md')}>
          Daxil ol
        </Link>
      </div>
    </main>
  );
}
