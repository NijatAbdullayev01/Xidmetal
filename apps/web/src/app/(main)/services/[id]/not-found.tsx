import Link from 'next/link';
import { buttonStyles } from '@/components/ui/button';

export default function ServiceNotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Xidmət tapılmadı
      </h1>
      <p className="text-sm text-muted-foreground">
        Bu xidmət mövcud deyil və ya artıq aktiv deyil.
      </p>
      <Link href="/services" className={buttonStyles('default', 'md')}>
        Xidmətlərə qayıt
      </Link>
    </div>
  );
}
