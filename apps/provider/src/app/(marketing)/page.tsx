import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  Briefcase,
  BrushCleaning,
  Bug,
  CalendarDays,
  Car,
  CheckCircle2,
  ClipboardCheck,
  HelpCircle,
  MessageSquare,
  Package,
  Scissors,
  Shield,
  Star,
  TrendingUp,
  UserPlus,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { ProviderLandingRedirect } from '@/components/landing/provider-landing-redirect';
import { buttonStyles } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: {
    absolute: 'Xidmət verən olun — Xidmətal ilə biznesinizi böyüdün',
  },
  description:
    'Xidmətal platformasında pulsuz qeydiyyatdan keçin, xidmətlərinizi əlavə edin və yeni xidmət alanlara çatın. 0% komissiya, asan idarəetmə, real-vaxt sifarişlər.',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

const stats = [
  { value: '0%', label: 'Komissiya — hazırda platforma haqqı yoxdur' },
  { value: 'Pulsuz', label: 'Qeydiyyat və xidmət əlavəsi' },
  { value: '24/7', label: 'Kabinetə istənilən vaxt giriş' },
  { value: 'Tək platforma', label: 'Bütün xidmət alanlar bir yerdə' },
];

const categories: { icon: LucideIcon; name: string; description: string }[] = [
  { icon: BrushCleaning, name: 'Təmizlik', description: 'Ev və ofis təmizliyi' },
  { icon: Wrench, name: 'Təmir', description: 'Ev, ofis və avtomobil təmiri' },
  { icon: Scissors, name: 'Gözəllik', description: 'Gözəllik və sağlamlıq xidmətləri' },
  { icon: Car, name: 'Nəqliyyat', description: 'Daşınma və sərnişin daşıma' },
  { icon: Package, name: 'Çatdırılma', description: 'Bağlama və sifariş çatdırılması' },
  { icon: Bug, name: 'Dezinfeksiya', description: 'Dezinfeksiya və sanitariya' },
];

const steps: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: UserPlus,
    title: 'Qeydiyyatdan keçin',
    description: 'Pulsuz hesab yaradın və profilinizi tamamlayın.',
  },
  {
    icon: Briefcase,
    title: 'Xidmətinizi yaradın',
    description: 'Kateqoriya seçin, təsvir yazın və qiymət təyin edin.',
  },
  {
    icon: ClipboardCheck,
    title: 'Sifarişləri qəbul edin',
    description: 'Kabinetinizdən sifarişləri izləyin, təsdiqləyin və icra edin.',
  },
  {
    icon: Star,
    title: 'Rəy toplayın və böyüyün',
    description: 'Keyfiyyətli xidmətlə reytinqinizi artırın, daha çox görünün.',
  },
];

const benefits: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Users,
    title: 'Yeni xidmət alanlar',
    description: 'Platforma xidmət axtaran istifadəçilərə çatır — siz yalnız işinizə fokuslanın.',
  },
  {
    icon: Shield,
    title: 'Etibarlı mühit',
    description: 'Sifarişlər sistem üzərindən qeydə alınır, status və tarixçə bir yerdə saxlanılır.',
  },
  {
    icon: MessageSquare,
    title: 'Asan idarəetmə',
    description: 'Xidmətlər, sifarişlər və reytinq — hamısı bir paneldə real vaxtda.',
  },
  {
    icon: CalendarDays,
    title: 'Öz cədvəliniz',
    description: 'İş saatlarınızı və mövcudluğunuzu özünüz müəyyən edin.',
  },
  {
    icon: Bell,
    title: 'Real-vaxt bildirişlər',
    description: 'Yeni sifarişlər və mesajlardan dərhal xəbərdar olun.',
  },
  {
    icon: TrendingUp,
    title: 'Reytinq sistemi',
    description: 'Rəylərlə görünürlüyünüzü artırın və platformada ön sıralara çıxın.',
  },
];

const faqs: { question: string; answer: string }[] = [
  {
    question: 'Qeydiyyat pulsuzdur?',
    answer:
      'Bəli, xidmət verən kimi qeydiyyat tamamilə pulsuzdur. Hesab yaradıb dərhal xidmət əlavə edə bilərsiniz.',
  },
  {
    question: 'Platforma komissiya alır?',
    answer:
      'Xeyr. Hal-hazırda Xidmətal xidmət verənlərdən heç bir komissiya və ya abunə haqqı tutmur.',
  },
  {
    question: 'Neçə xidmət yarada bilərəm?',
    answer:
      'Bir hesabda bir neçə xidmət yarada bilərsiniz. Məsələn, eyni anda təmizlik və kiçik təmir xidmətləri təklif edə bilərsiniz.',
  },
  {
    question: 'Sifariş gəldikdə necə xəbər tuturam?',
    answer:
      'Yeni sifariş kabinetinizin «Sifarişlər» bölməsində görünür və bildiriş vasitəsilə xəbərdar olursunuz.',
  },
  {
    question: 'Sifarişi rədd edə bilərəm?',
    answer:
      'Bəli, uyğun olmayan sifarişləri qəbul etməmək sizin hüququnuzdur.',
  },
  {
    question: 'Reytinq necə hesablanır?',
    answer:
      'Tamamlanan sifarişlərdən sonra xidmət alanlar 1–5 ulduzla qiymətləndirmə edir. Orta reytinq profilinizdə göstərilir.',
  },
];

function HeroDashboardPreview() {
  return (
    <div className="relative" aria-hidden>
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-brand/30 to-brand/5 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-brand" />
            <span className="text-sm font-semibold">Kabinet</span>
          </div>
          <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
            Onlayn
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 p-5">
          {[
            { label: 'Aktiv xidmətlər', value: '3' },
            { label: 'Gözləyən sifariş', value: '2' },
            { label: 'Tamamlanan', value: '24' },
            { label: 'Reytinq', value: '4.8 ★' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3"
            >
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2 px-5 pb-5">
          <div className="flex items-center gap-3 rounded-xl border border-brand/30 bg-brand/10 px-4 py-3">
            <Bell className="h-4 w-4 shrink-0 text-brand-dark" />
            <p className="text-sm">Yeni sifariş: Ev təmizliyi</p>
            <span className="ml-auto text-xs font-medium text-brand-dark">Yeni</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProviderLandingPage() {
  return (
    <>
      <ProviderLandingRedirect />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand/10 to-background">
        <div className="mx-auto max-w-7xl px-4 pt-14 pb-12 sm:px-6 sm:pt-20 lg:px-8 lg:pt-28 lg:pb-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-sm font-medium text-brand-dark">
                <Star className="h-4 w-4" />
                Xidmət verənlər üçün platforma
              </span>

              <h1 className="mt-5 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl lg:leading-tight">
                Xidmətlərinizə{' '}
                <span className="text-brand-dark">yeni xidmət alanlar</span> tapın
              </h1>

              <p className="mt-5 max-w-xl text-lg text-muted-foreground sm:text-xl">
                Xidmətal xidmət verənlərlə xidmət alanları bir araya gətirən
                platformadır. Pulsuz qeydiyyatdan keçin, xidmətinizi əlavə edin və
                sifariş qəbul etməyə başlayın.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/register"
                  className={cn(buttonStyles('default', 'lg'), 'justify-center')}
                >
                  Pulsuz qeydiyyat
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/login"
                  className={cn(buttonStyles('outline', 'lg'), 'justify-center')}
                >
                  Daxil ol
                </Link>
              </div>

              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
                {['Pulsuz qeydiyyat', '0% komissiya', 'Bir neçə dəqiqəyə hazır'].map(
                  (item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-dark" />
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>

            <HeroDashboardPreview />
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.value} className="text-center">
                <p className="text-3xl font-bold text-brand-dark sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="scroll-mt-24 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Hansı xidmətləri təklif edə bilərsiniz?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Ehtiyac duyulan sahələrdə xidmətinizi yaradın və xidmət alanlara çatın
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <div
                  key={category.name}
                  className="group rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all hover:border-brand/40 hover:shadow-md sm:p-6"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand/40 to-brand/15 ring-1 ring-brand/25 transition-transform group-hover:scale-105">
                    <Icon className="h-6 w-6 text-brand-foreground" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{category.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="scroll-mt-24 bg-muted/50 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              4 sadə addımda başlayın
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Qeydiyyatdan ilk sifarişə qədər — hamısı bir neçə dəqiqə
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.title}
                  className="relative rounded-2xl border border-border bg-card p-6 shadow-sm"
                >
                  <span className="text-sm font-bold text-brand-dark">
                    Addım {index + 1}
                  </span>
                  <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/20">
                    <Icon className="h-6 w-6 text-brand-dark" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="scroll-mt-24 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Niyə Xidmətal?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Platformamız xidmət verənlərin işini asanlaşdırmaq üçün yaradılıb
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border/50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand/20">
                    <Icon className="h-6 w-6 text-brand-dark" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 bg-muted/50 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/20">
              <HelpCircle className="h-6 w-6 text-brand-dark" />
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Tez-tez verilən suallar
            </h2>
            <p className="mt-3 text-muted-foreground">
              Ən çox soruşulan suallara cavablar
            </p>
          </div>

          <div className="mt-10 space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-xl border border-border bg-card shadow-sm [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium transition-colors hover:text-brand-dark">
                  {faq.question}
                  <span
                    aria-hidden
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div className="border-t border-border px-5 py-4 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="scroll-mt-24 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-brand px-6 py-12 text-center sm:px-16 sm:py-16">
            <h2 className="text-3xl font-bold text-brand-foreground sm:text-4xl">
              Hazırsınız? İndi başlayın
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-brand-foreground/80">
              Bir neçə dəqiqə ərzində qeydiyyatdan keçin, ilk xidmətinizi yaradın və
              Xidmətal-da potensial xidmət alanlara çatın.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-foreground px-6 py-3 font-medium text-brand transition-colors hover:bg-brand-foreground/90"
              >
                Pulsuz qeydiyyat
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-brand-foreground/30 px-6 py-3 font-medium text-brand-foreground transition-colors hover:bg-brand-foreground/10"
              >
                Daxil ol
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
