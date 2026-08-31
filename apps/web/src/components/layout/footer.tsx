'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { Logo } from '@/components/layout/logo';
import { BecomeProviderLink } from '@/components/auth/become-provider-link';
import { APP } from '@xidmetal/shared';
import { cn } from '@/lib/utils';

type FooterLink = {
  href: string;
  label: string;
  becomeProvider?: boolean;
};

const footerSections: { key: string; title: string; links: FooterLink[] }[] = [
  {
    key: 'platform',
    title: 'Platforma',
    links: [
      { href: '/services', label: 'Xidmətlər' },
            { href: '/categories', label: 'Kateqoriyalar' },
            { href: '/categories/temizlik', label: 'Təmizlik' },
            { href: '/categories/temir', label: 'Təmir' },
            { href: '/faq', label: 'Tez-tez verilən suallar' },
      { href: '/how-it-works', label: 'Necə işləyir?' },
      { href: '/terms', label: 'İstifadə qaydaları' },
    ],
  },
  {
    key: 'provider',
    title: 'Xidmət verən üçün',
    links: [
      { href: '/register?role=provider', label: 'Xidmət verən ol', becomeProvider: true },
      { href: '/provider/guide', label: 'Xidmət verən bələdçisi' },
    ],
  },
  {
    key: 'company',
    title: 'Şirkət',
    links: [
      { href: '/about', label: 'Haqqımızda' },
      { href: '/contact', label: 'Əlaqə' },
      { href: '/privacy', label: 'Məxfilik' },
    ],
  },
];

const linkClassName =
  'text-sm text-muted-foreground transition-colors hover:text-foreground';

function FooterLinkList({
  links,
  className,
}: {
  links: FooterLink[];
  className?: string;
}) {
  return (
    <ul className={className ?? 'mt-3 space-y-2'}>
      {links.map((link) => (
        <li key={link.href}>
          {link.becomeProvider ? (
            <BecomeProviderLink className={linkClassName}>
              {link.label}
            </BecomeProviderLink>
          ) : (
            <Link href={link.href} className={linkClassName}>
              {link.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

function FooterMobileNav() {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const toggleSection = (key: string) => {
    setOpenKey((prev) => (prev === key ? null : key));
  };

  return (
    <nav
      aria-label="Alt naviqasiya"
      className="divide-y divide-border border-y border-border sm:hidden"
    >
      {footerSections.map((section) => {
        const isOpen = openKey === section.key;
        const panelId = `footer-panel-${section.key}`;
        const buttonId = `footer-trigger-${section.key}`;

        return (
          <div key={section.key}>
            <button
              id={buttonId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggleSection(section.key)}
              className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 py-2.5 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              {section.title}
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                  isOpen && 'rotate-180',
                )}
                aria-hidden
              />
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={cn(
                'grid transition-[grid-template-rows] duration-200 ease-out',
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <FooterLinkList
                  links={section.links}
                  className="space-y-2.5 pb-3 pl-0.5"
                />
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/50 safe-bottom">
      <div className="mx-auto max-w-7xl px-4 pt-8 pb-2 sm:px-6 sm:pt-12 sm:pb-3 lg:px-8">
        <div className="grid gap-6 sm:gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="flex flex-col gap-[6px] lg:col-span-4">
            <Link href="/" className="inline-flex w-fit shrink-0 items-center">
              <Logo className="h-10" variant="transparent" />
            </Link>
            <p className="text-sm text-muted-foreground">{APP.description}</p>
          </div>

          <FooterMobileNav />

          {/* Desktop / tablet: həmişə açıq sütunlar */}
          <div className="hidden grid-cols-3 gap-x-10 sm:grid lg:col-span-8 lg:gap-x-12">
            {footerSections.map((section) => (
              <div key={section.key}>
                <h3 className="text-sm font-semibold">{section.title}</h3>
                <FooterLinkList links={section.links} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 text-center text-xs text-muted-foreground sm:mt-6 sm:border-t sm:border-border sm:pt-4 sm:text-sm">
          © {new Date().getFullYear()} Xidmətal. Bütün hüquqlar qorunur.
        </div>
      </div>
    </footer>
  );
}
