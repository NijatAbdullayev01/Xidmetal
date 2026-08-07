'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { buttonStyles } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Kabinetdə xəta baş verdi
      </h1>
      <p className="text-sm text-muted-foreground">
        Səhifə yüklənərkən gözlənilməz problem yarandı. Yenidən cəhd edin.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className={buttonStyles('default', 'md')}>
          Yenidən cəhd et
        </button>
        <Link href="/dashboard" className={buttonStyles('outline', 'md')}>
          Kabinetə qayıt
        </Link>
      </div>
    </div>
  );
}
