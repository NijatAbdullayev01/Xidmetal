import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';

export default function CategoryNotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Kateqoriya tapılmadı</h1>
      <p className="mt-3 text-muted-foreground">
        Axtardığınız kateqoriya mövcud deyil və ya silinib. Başqa kateqoriyalara
        baxa bilərsiniz.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/services" className={buttonStyles('default', 'md')}>
          Xidmətlərə bax
        </Link>
        <Link
          href="/"
          className={buttonStyles('outline', 'md') + ' inline-flex items-center gap-2'}
        >
          <ArrowLeft className="h-4 w-4" />
          Ana səhifə
        </Link>
      </div>
    </div>
  );
}
