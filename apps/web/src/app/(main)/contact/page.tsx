import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  MessageCircle,
  HelpCircle,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { APP } from '@xidmetal/shared';
import { ContactForm } from '@/components/contact/contact-form';

export const metadata: Metadata = {
  title: 'Əlaqə | Xidmetal',
  description:
    'Xidmetal komandası ilə əlaqə saxlayın. Sual, təklif və ya dəstək üçün bizə yazın.',
};

const contactInfo: {
  icon: LucideIcon;
  title: string;
  value: string;
  href?: string;
}[] = [
  {
    icon: Mail,
    title: 'E-mail',
    value: 'info@xidmetal.az',
    href: 'mailto:info@xidmetal.az',
  },
  {
    icon: Phone,
    title: 'Telefon',
    value: '+994 12 345 67 89',
    href: 'tel:+994123456789',
  },
  {
    icon: MapPin,
    title: 'Ünvan',
    value: 'Bakı, Azərbaycan',
  },
  {
    icon: Clock,
    title: 'İş saatları',
    value: 'Bazar ertəsi – Cümə, 09:00 – 18:00',
  },
];

const supportTopics: {
  title: string;
  description: string;
  href: string;
}[] = [
  {
    title: 'Xidmət verən bələdçisi',
    description: 'Platformada xidmət təklif etmək üçün addım-addım təlimat.',
    href: '/provider/guide',
  },
  {
    title: 'Necə işləyir?',
    description: 'Sifariş vermək və xidmət tapmaq prosesi haqqında məlumat.',
    href: '/how-it-works',
  },
  {
    title: 'Haqqımızda',
    description: 'Xidmetal missiyası, dəyərləri və komanda haqqında.',
    href: '/about',
  },
];

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand/15 via-brand/5 to-background">
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Bizimlə <span className="text-brand">əlaqə</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Sualınız, təklifiniz və ya texniki problem var? {APP.name} komandası sizə
              kömək etməyə hazırdır. Formu doldurun və ya birbaşa əlaqə məlumatlarımızdan
              istifadə edin.
            </p>
          </div>
        </div>
      </section>

      {/* Form + Contact info */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-5 lg:gap-12">
            <div className="lg:col-span-3">
              <ContactForm />
            </div>

            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/20">
                  <MessageCircle className="h-6 w-6 text-brand-dark" aria-hidden />
                </div>
                <h2 className="mt-4 text-xl font-semibold">Birbaşa əlaqə</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Form göndərmədən də bizimlə əlaqə saxlaya bilərsiniz.
                </p>

                <ul className="mt-6 space-y-5">
                  {contactInfo.map((item) => {
                    const Icon = item.icon;
                    const content = (
                      <>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Icon className="h-5 w-5 text-brand-dark" aria-hidden />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">{item.value}</p>
                        </div>
                      </>
                    );

                    return (
                      <li key={item.title}>
                        {item.href ? (
                          <a
                            href={item.href}
                            className="flex items-start gap-4 transition-colors hover:text-brand-dark"
                          >
                            {content}
                          </a>
                        ) : (
                          <div className="flex items-start gap-4">{content}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="rounded-2xl border border-brand/30 bg-brand/10 p-6 sm:p-8">
                <h3 className="font-semibold text-brand-foreground">Cavab müddəti</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-foreground/80">
                  Mesajlarınıza adətən 1–2 iş günü ərzində cavab veririk. Təcili hallar
                  üçün telefon xəttindən istifadə edə bilərsiniz.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Helpful links */}
      <section className="border-t border-border bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/20">
              <HelpCircle className="h-6 w-6 text-brand-dark" aria-hidden />
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Tez-tez axtarılanlar</h2>
            <p className="mt-3 text-muted-foreground">
              Cavabınızı bəlkə də bu bölmələrdə tapa bilərsiniz
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {supportTopics.map((topic) => (
              <Link
                key={topic.href}
                href={topic.href}
                className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-brand/40"
              >
                <h3 className="font-semibold group-hover:text-brand-dark">{topic.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {topic.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-dark">
                  Ətraflı
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
