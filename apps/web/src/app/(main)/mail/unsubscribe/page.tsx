import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { APP } from '@xidmetal/shared';
import { NOINDEX } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'E-poçt bildirişləri',
  description: `${APP.name} sifariş e-poçtları hesabınızdakı əməliyyatlara görə göndərilir.`,
  robots: NOINDEX,
};

export default function MailUnsubscribePage() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand/15 via-brand/5 to-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/20">
            <Mail className="h-6 w-6 text-brand-dark" aria-hidden />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            Sifariş e-poçtları
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {APP.name} sizə yalnız hesabınızdakı sifariş (təsdiq, tamamlanma) və
            təhlükəsizlik kodları üçün yazır. Bu, reklam məktubu deyil.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Sifariş bildirişlərini dayandırmaq istəyirsinizsə,{' '}
            <a
              href="mailto:info@xidmetal.com?subject=E-po%C3%A7t%20bildiri%C5%9Fl%C9%99ri"
              className="font-medium text-brand-dark underline-offset-2 hover:underline"
            >
              info@xidmetal.com
            </a>{' '}
            ünvanına yazın.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
          >
            Əlaqə
          </Link>
        </div>
      </div>
    </section>
  );
}
