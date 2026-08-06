'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { buttonStyles } from '@/components/ui/button';

export default function GlobalError({
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
    <div className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Xəta baş verdi
      </h1>
      <p className="text-sm text-muted-foreground">
        Səhifə yüklənərkən gözlənilməz problem yarandı. Yenidən cəhd edin.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className={buttonStyles('default', 'md')}>
          Yenidən cəhd et
        </button>
        <Link href="/" className={buttonStyles('outline', 'md')}>
          Ana səhifə
        </Link>
      </div>
    </div>
  );
}
