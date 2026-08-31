import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Search,
  Star,
  CalendarCheck,
  Bell,
  MessageSquare,
  CheckCircle2,
  UserPlus,
  Briefcase,
  Shield,
  Clock,
  Users,
  ListFilter,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import { APP } from '@xidmetal/shared';
import { buttonStyles } from '@/components/ui/button';
import { PageBreadcrumbs } from '@/components/layout/breadcrumbs';
import { JsonLd } from '@/components/seo/json-ld';
import { buildBreadcrumbJsonLd, buildHowToJsonLd } from '@/lib/seo-schema';
import { pageMetadata } from '@/lib/seo';
import { getSiteUrl } from '@/lib/site-url';

export const metadata: Metadata = pageMetadata({
  title: 'Necə işləyir?',
  description:
    'Xidmətal-da xidmət tapmaq, müqayisə etmək, sifariş vermək və izləmək prosesi — addım-addım, sadə və aydın izah.',
  canonical: '/how-it-works',
});

const customerSteps: {
  step: number;
  icon: LucideIcon;
  title: string;
  description: string;
  details: string[];
}[] = [
  {
    step: 1,
    icon: Search,
    title: 'Xidmət tapın',
    description:
      'Kateqoriya seçin və ya axtarış çubuğundan ehtiyacınıza uyğun xidməti tapın. Təmizlik, təmir, gözəllik və daha onlarla sahə bir yerdədir.',
    details: [
      'Kateqoriyalar səhifəsindən və ya axtarışdan başlayın',
      'Şəhər, qiymət və reytinqə görə filtrləyin',
      'Xidmət təsvirini və qiymət tipini oxuyun',
    ],
  },
  {
    step: 2,
    icon: Star,
    title: 'Müqayisə edin',
    description:
      'Xidmət verənlərin reytinqini, rəylərini və qiymətini yan-yana görün. Real istifadəçi təcrübələri ən yaxşı seçimi etməyə kömək edir.',
    details: [
      'Orta reytinq və rəy sayına baxın',
      'Xidmət verənin profilini və təcrübəsini yoxlayın',
      'Qiymət tipini anlayın: sabit, saatlıq və ya günlük',
    ],
  },
  {
    step: 3,
    icon: CalendarCheck,
    title: 'Sifariş verin',
    description:
      'Uyğun xidməti tapdıqdan sonra tarix, vaxt və qısa qeyd əlavə edərək sifariş göndərin. Hesab yaratmaq bir neçə saniyə çəkir.',
    details: [
      'İstədiyiniz tarix və vaxtı seçin və ya «İndi çağır»',
      'Əlavə tələblərinizi qeyd edin',
      'Ödəniş platformada aparılmır — haqqı tərəflər özləri razılaşdırır',
      'Sifariş xidmət verənə göndərilir',
    ],
  },
  {
    step: 4,
    icon: Bell,
    title: 'Sifarişi izləyin',
    description:
      'Xidmət verən sifarişi təsdiqlədikdən sonra proses «İcrada» statusuna keçir. Kabinetinizdən hər mərhələni real vaxtda izləyə bilərsiniz.',
    details: [
      'Gözləyən → Təsdiqlənmiş → İcrada → Tamamlandı',
      'Status dəyişikliklərini kabinetdən izləyin',
      'Lazım olsa xidmət verənlə əlaqə saxlayın',
    ],
  },
  {
    step: 5,
    icon: MessageSquare,
    title: 'Rəy yazın',
    description:
      'Xidmət tamamlandıqdan sonra 1–5 ulduzla qiymətləndirin. Rəyiniz digər istifadəçilərə kömək edir və keyfiyyətli xidmət verənləri ön plana çıxarır.',
    details: [
      'Tamamlanan sifarişlər üçün rəy bölməsi açılır',
      'Dürüst və konkret rəy yazın',
      'Yüksək reytinqli xidmət verənlər daha çox görünür',
    ],
  },
];

const bookingStatuses: {
  label: string;
  description: string;
}[] = [
  {
    label: 'Gözləyir',
    description: 'Sifariş göndərildi, xidmət verən cavab gözlənilir',
  },
  {
    label: 'Təsdiqləndi',
    description: 'Xidmət verən sifarişi qəbul etdi',
  },
  {
    label: 'İcrada',
    description: 'Xidmət hazırda icra olunur',
  },
  {
    label: 'Tamamlandı',
    description: 'Xidmət uğurla bitdi, rəy yaza bilərsiniz',
  },
];

const benefits: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: Shield,
    title: 'Etibarlı mühit',
    description:
      'Sifarişlər sistemdə qeydə alınır. Qiymət, tarix və status açıq şəkildə göstərilir.',
  },
  {
    icon: ListFilter,
    title: 'Aydın filtrlər',
    description:
      'Kateqoriya, qiymət, reytinq və yer üzrə axtarış — lazım olanı tez tapın.',
  },
  {
    icon: Clock,
    title: 'Vaxta qənaət',
    description:
      'Telefon zəngləri və təsadüfi axtarışlar əvəzinə bir platformada hər şeyi idarə edin.',
  },
  {
    icon: MapPin,
    title: 'Yerli xidmətlər',
    description:
      'Öz şəhər və rayonunuza uyğun xidmət verənləri tapın və yaxınlıqdakı seçimlərdən faydalanın.',
  },
];

const providerQuickSteps: {
  icon: LucideIcon;
  title: string;
  text: string;
}[] = [
  {
    icon: UserPlus,
    title: 'Qeydiyyat',
    text: 'Pulsuz hesab yaradın və profilinizi tamamlayın.',
  },
  {
    icon: Briefcase,
    title: 'Xidmət əlavə edin',
    text: 'Kateqoriya, qiymət və təsvir ilə xidmətinizi dərc edin.',
  },
  {
    icon: CalendarCheck,
    title: 'Sifariş qəbul edin',
    text: 'Gələn sifarişləri təsdiqləyin və icra edin.',
  },
  {
    icon: Star,
    title: 'Reytinq qazanın',
    text: 'Keyfiyyətli xidmətlə daha çox xidmət alan cəlb edin.',
  },
];

export default function HowItWorksPage() {
  const siteUrl = getSiteUrl();

  return (
    <>
      <JsonLd
        data={[
          buildBreadcrumbJsonLd(siteUrl, [
            { name: 'Ana səhifə', path: '/' },
            { name: 'Necə işləyir?', path: '/how-it-works' },
          ]),
          buildHowToJsonLd(siteUrl, {
            name: 'Xidmətal-da necə sifariş verilir',
            description:
              'Xidmət tapmaq, müqayisə etmək, sifariş vermək və izləmək — addım-addım.',
            path: '/how-it-works',
            steps: customerSteps.map((step) => ({
              name: step.title,
              text: step.description,
            })),
          }),
        ]}
      />
      <PageBreadcrumbs
        items={[
          { href: '/', label: 'Ana səhifə' },
          { label: 'Necə işləyir?' },
        ]}
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand/15 via-brand/5 to-background">
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              <span className="text-brand">Necə</span> işləyir?
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              {APP.name} ilə xidmət tapmaq, sifariş vermək və prosesi izləmək çox sadədir.
              Aşağıda hər addımı vizual və aydın şəkildə izah etdik — 5 addımda hazırsınız.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/services" className={buttonStyles('default', 'lg')}>
                Xidmətlərə bax
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/register" className={buttonStyles('outline', 'lg')}>
                Pulsuz qeydiyyat
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick overview */}
      <section className="border-y border-border bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { value: '5 addım', label: 'Sifarişdən rəyə qədər' },
              { value: 'Pulsuz', label: 'Axtarış və qeydiyyat' },
              { value: 'Aydın', label: 'Hər mərhələdə status izləmə' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border/70 bg-card px-6 py-5 text-center shadow-sm"
              >
                <p className="text-2xl font-bold text-brand-dark">{item.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual flow — desktop timeline */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="hidden lg:block">
            <div className="relative flex items-start justify-between gap-2">
              <div
                aria-hidden
                className="absolute left-[10%] right-[10%] top-7 h-0.5 bg-gradient-to-r from-brand/20 via-brand/60 to-brand/20"
              />
              {customerSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.step} className="relative z-10 flex w-36 flex-col items-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand shadow-sm ring-4 ring-background">
                      <Icon className="h-6 w-6 text-brand-foreground" strokeWidth={2} />
                    </div>
                    <span className="mt-3 text-xs font-semibold uppercase tracking-wider text-brand-dark">
                      Addım {step.step}
                    </span>
                    <p className="mt-1 text-sm font-medium leading-tight">{step.title}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile flow — vertical */}
          <div className="lg:hidden">
            <div className="relative space-y-0">
              {customerSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.step} className="relative flex gap-4 pb-8 last:pb-0">
                    {index < customerSteps.length - 1 && (
                      <div
                        aria-hidden
                        className="absolute left-[1.65rem] top-14 bottom-0 w-0.5 bg-brand/30"
                      />
                    )}
                    <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand shadow-sm">
                      <Icon className="h-6 w-6 text-brand-foreground" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 pt-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-brand-dark">
                        Addım {step.step}
                      </span>
                      <p className="mt-0.5 font-semibold">{step.title}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Detailed customer steps */}
      <section className="border-t border-border bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Xidmət alan üçün addımlar</h2>
            <p className="mt-3 mx-auto max-w-2xl text-muted-foreground">
              Axtarışdan tamamlanmış sifarişə qədər — hər mərhələni ətraflı izah edirik
            </p>
          </div>

          <div className="mt-14 space-y-6">
            {customerSteps.map((step) => {
              const Icon = step.icon;
              const isEven = step.step % 2 === 0;
              return (
                <article
                  key={step.step}
                  className={`flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 lg:flex-row lg:items-center lg:gap-10 ${
                    isEven ? 'lg:flex-row-reverse' : ''
                  }`}
                >
                  <div className="flex shrink-0 items-center gap-5 lg:w-72">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/40 to-brand/15 ring-1 ring-brand/30">
                      <Icon className="h-8 w-8 text-brand-foreground" strokeWidth={1.75} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-brand-dark">
                        Addım {step.step}
                      </span>
                      <h3 className="mt-1 text-xl font-semibold">{step.title}</h3>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="leading-relaxed text-muted-foreground">{step.description}</p>
                    <ul className="mt-4 space-y-2">
                      {step.details.map((detail) => (
                        <li key={detail} className="flex items-start gap-2 text-sm">
                          <CheckCircle2
                            className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark"
                            aria-hidden
                          />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Booking status flow */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Sifariş statusları</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Sifariş verdikdən sonra hər mərhələni kabinetinizdən izləyə bilərsiniz.
                Statuslar aydın və başa düşüləndir — nə vaxt gözləməli, nə vaxt xidmətin
                icra olunduğunu bilirsiniz.
              </p>
              <Link
                href="/register"
                className={buttonStyles('outline', 'md') + ' mt-8'}
              >
                Hesab yarat və izlə
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 rounded-3xl bg-gradient-to-br from-brand/15 to-brand/5 blur-2xl"
              />
              <div className="relative space-y-3 rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
                {bookingStatuses.map((item, index) => (
                  <div key={item.label} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          index === bookingStatuses.length - 1
                            ? 'bg-brand text-brand-foreground'
                            : 'bg-brand/20 text-brand-dark'
                        }`}
                      >
                        {index + 1}
                      </div>
                      {index < bookingStatuses.length - 1 && (
                        <div aria-hidden className="my-1 h-6 w-0.5 bg-brand/30" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
                      <span className="font-semibold">{item.label}</span>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-t border-border bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Niyə bu qədər sadədir?</h2>
            <p className="mt-3 text-muted-foreground">
              Platformanı istifadəçilər üçün aydın və rahat etmək bizim prioritetimizdir
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className="rounded-xl bg-card p-6 shadow-sm ring-1 ring-border/50"
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

      {/* Provider path */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/20">
                  <Users className="h-6 w-6 text-brand-dark" />
                </div>
                <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                  Xidmət verən olmaq istəyirsiniz?
                </h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  Əgər bacarıqlarınızı monetizasiya etmək istəyirsinizsə, 4 sadə addımla
                  platformada xidmət təklif edə bilərsiniz. Ətraflı bələdçi üçün aşağıdakı
                  linkə keçin.
                </p>
                <Link
                  href="/provider/guide"
                  className={buttonStyles('default', 'md') + ' mt-6'}
                >
                  Xidmət verən bələdçisi
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:max-w-lg">
                {providerQuickSteps.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="flex gap-3 rounded-xl border border-border/70 bg-muted/30 p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/15">
                        <Icon className="h-5 w-5 text-brand-dark" />
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{item.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-16 sm:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-brand px-8 py-12 text-center sm:px-16 sm:py-16">
            <h2 className="text-3xl font-bold text-brand-foreground">
              İndi sınayın — çox sadədir
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-brand-foreground/80">
              Lazım olan xidməti tapın, sifariş verin və prosesi kabinetinizdən izləyin.
              Bir neçə dəqiqəyə hazırsınız.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/services"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-foreground px-6 py-3 font-medium text-brand transition-colors hover:bg-brand-foreground/90"
              >
                Xidmət axtar
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/categories"
                className="inline-flex items-center gap-2 rounded-lg border border-brand-foreground/30 px-6 py-3 font-medium text-brand-foreground transition-colors hover:bg-brand-foreground/10"
              >
                Kateqoriyalara bax
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
