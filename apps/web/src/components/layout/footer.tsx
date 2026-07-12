import Link from 'next/link';
import { Logo } from '@/components/layout/logo';
import { APP } from '@xidmetal/shared';

const footerLinks = {
  platform: [
    { href: '/faq', label: 'Tez-tez verilən suallar' },
    { href: '/how-it-works', label: 'Necə işləyir?' },
  ],
  provider: [
    { href: '/register?role=provider', label: 'Xidmət verən ol' },
    { href: '/provider/guide', label: 'Xidmət verən bələdçisi' },
  ],
  company: [
    { href: '/about', label: 'Haqqımızda' },
    { href: '/contact', label: 'Əlaqə' },
    { href: '/privacy', label: 'Məxfilik' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/50 safe-bottom">
      <div className="mx-auto max-w-7xl px-4 pt-10 pb-6 sm:px-6 sm:pt-12 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="flex flex-col gap-[6px] lg:col-span-4">
            <Link href="/" className="inline-flex w-fit shrink-0 items-center">
              <Logo className="h-10" variant="transparent" />
            </Link>
            <p className="text-sm text-muted-foreground">{APP.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 sm:gap-x-10 lg:col-span-8 lg:gap-x-12">
            {Object.entries(footerLinks).map(([key, links]) => (
              <div key={key} className={key === 'company' ? 'col-span-2 sm:col-span-1' : undefined}>
                <h3 className="text-sm font-semibold">
                  {key === 'platform' ? 'Platforma' : key === 'provider' ? 'Xidmət verən üçün' : 'Şirkət'}
                </h3>
                <ul className="mt-3 space-y-2">
                  {links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Xidmetal. Bütün hüquqlar qorunur.
        </div>
      </div>
    </footer>
  );
}
