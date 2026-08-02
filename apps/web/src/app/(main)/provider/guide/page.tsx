import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  UserPlus,
  Briefcase,
  ClipboardCheck,
  Star,
  TrendingUp,
  Shield,
  MessageSquare,
  Clock,
  MapPin,
  ImageIcon,
  CheckCircle2,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import { BecomeProviderLink } from '@/components/auth/become-provider-link';
import { buttonStyles } from '@/components/ui/button';
import { ProviderGuideHeroCta } from './provider-guide-hero-cta';

export const metadata: Metadata = {
  title: 'Xidmət verən bələdçisi | Xidmətal',
  description:
    'Xidmətal platformasında xidmət verən kimi necə qeydiyyatdan keçmək, xidmət yaratmaq, sifarişləri idarə etmək və reytinqinizi artırmaq barədə addım-addım bələdçi.',
};

const steps: {
  step: number;
  icon: LucideIcon;
  title: string;
  description: string;
  details: string[];
}[] = [
  {
    step: 1,
    icon: UserPlus,
    title: 'Qeydiyyatdan keçin',
    description:
      'Pulsuz hesab yaradın və profilinizi tamamlayın. Müştərilərin sizi tanıması üçün ad, əlaqə və qısa bio əlavə edin.',
    details: [
      '«Xidmət verən ol» düyməsinə klikləyin',
      'E-poçt və parol ilə hesab yaradın',
      'Profil məlumatlarınızı doldurun',
    ],
  },
  {
    step: 2,
    icon: Briefcase,
    title: 'Xidmətinizi yaradın',
    description:
      'Təklif etdiyiniz xidməti ətraflı təsvir edin, qiymət və yer məlumatını qeyd edin. Yaxşı təsvir daha çox sifariş gətirir.',
    details: [
      'Kateqoriya seçin (təmizlik, təmir, gözəllik və s.)',
      'Başlıq və ətraflı təsvir yazın',
      'Qiymət tipini təyin edin (sabit, saatlıq, günlük)',
      'Xidmət yerini və ya uzaqdan xidmət seçimini göstərin',
    ],
  },
  {
    step: 3,
    icon: ClipboardCheck,
    title: 'Sifarişləri idarə edin',
    description:
      'Müştərilərdən gələn sifarişləri kabinetinizdən izləyin. Təsdiqləyin, icra edin və tamamlayın.',
    details: [
      'Gözləyən sifarişləri vaxtında cavablandırın',
      'Sifarişi qəbul etdikdən sonra «İcrada» statusuna keçirin',
      'Xidmət bitdikdən sonra «Tamamlandı» olaraq işarələyin',
    ],
  },
  {
    step: 4,
    icon: Star,
    title: 'Reytinqinizi artırın',
    description:
      'Keyfiyyətli xidmət və sürətli cavab müştəri rəylərini yaxşılaşdırır. Yüksək reytinq daha çox görünürlük deməkdir.',
    details: [
      'Müştərilərlə aydın və hörmətli ünsiyyət saxlayın',
      'Vəd etdiyiniz vaxtda xidməti tamamlayın',
      'Rəylərə cavab verin və təcrübənizi təkmilləşdirin',
    ],
  },
];

const benefits: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: TrendingUp,
    title: 'Yeni müştərilər',
    description:
      'Platformamız minlərlə xidmət axtaran istifadəçiyə çatır. Siz yalnız xidmətinizə fokuslanın — axtarışı biz edirik.',
  },
  {
    icon: Shield,
    title: 'Etibarlı mühit',
    description:
      'Sifarişlər sistem üzərindən qeydə alınır. Hər sifarişin statusu, tarixçəsi və əlaqə məlumatı bir yerdədir.',
  },
  {
    icon: MessageSquare,
    title: 'Asan idarəetmə',
    description:
      'Kabinetinizdən xidmətlərinizi, sifarişlərinizi və reytinqinizi real vaxtda izləyin. Hər şey bir paneldə.',
  },
  {
    icon: Clock,
    title: 'Öz cədvəliniz',
    description:
      'İş saatlarınızı və mövcudluğunuzu özünüz müəyyən edin. Hansı sifarişi qəbul edəcəyinizə siz qərar verirsiniz.',
  },
];

const tips: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: ImageIcon,
    title: 'Profil və təsvirə diqqət',
    description:
      'Aydın başlıq, konkret qiymət və real təcrübəni əks etdirən təsvir müştərinin etibarını artırır.',
  },
  {
    icon: MapPin,
    title: 'Düzgün yer məlumatı',
    description:
      'Xidmət göstərdiyiniz ərazini dəqiq qeyd edin. Bu, yaxınlıqdakı müştərilərin sizi tapmasına kömək edir.',
  },
  {
    icon: Clock,
    title: 'Sürətli cavab',
    description:
      'Gözləyən sifarişlərə tez reaksiya verin. İlk cavab verən xidmət verənlər daha çox sifariş əldə edir.',
  },
  {
    icon: Star,
    title: 'Keyfiyyətə fokus',
    description:
      'Hər tamamlanan sifariş reytinqinizə təsir edir. Davamlı keyfiyyət platformada üst sıralara çıxmağın açarıdır.',
  },
];

const faqs: { question: string; answer: string }[] = [
  {
    question: 'Qeydiyyat pulsuzdur?',
    answer:
      'Bəli, Xidmətal-da xidmət verən kimi qeydiyyat tamamilə pulsuzdur. Hesab yaradıb dərhal xidmət əlavə edə bilərsiniz.',
  },
  {
    question: 'Neçə xidmət yarada bilərəm?',
    answer:
      'Bir hesabda bir neçə xidmət yarada bilərsiniz. Məsələn, eyni anda təmizlik və kiçik təmir xidmətləri təklif edə bilərsiniz.',
  },
  {
    question: 'Sifariş gəldikdə necə xəbər tuturam?',
    answer:
      'Yeni sifariş kabinetinizin «Sifarişlər» bölməsində görünür. Gözləyən sifarişləri panelinizdən izləyib idarə edə bilərsiniz.',
  },
  {
    question: 'Sifarişi rədd edə bilərəm?',
    answer:
      'Bəli, uyğun olmayan sifarişləri qəbul etməmək sizin hüququnuzdur. Lakin tez-tez rədd cavabı reytinqinizə mənfi təsir edə bilər.',
  },
  {
    question: 'Reytinq necə hesablanır?',
    answer:
      'Tamamlanan sifarişlərdən sonra müştərilər 1–5 ulduzla qiymətləndirmə edə bilər. Orta reytinq profilinizdə göstərilir.',
  },
];

export default function ProviderGuidePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand/15 via-brand/5 to-background">
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Xidmət verən{' '}
              <span className="text-brand">bələdçisi</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Xidmətal-da xidmət verən kimi necə başlamaq, xidmət yaratmaq, sifarişləri
              idarə etmək və reytinqinizi artırmaq — hamısını addım-addım öyrənin.
            </p>
            <ProviderGuideHeroCta />
          </div>
        </div>
      </section>

      {/* Quick overview */}
      <section className="border-y border-border bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { value: '4 addım', label: 'Başlamaq üçün kifayətdir' },
              { value: 'Pulsuz', label: 'Qeydiyyat və xidmət əlavəsi' },
              { value: '24/7', label: 'Kabinetə istənilən vaxt giriş' },
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

      {/* Steps */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Necə başlamaq olar?</h2>
            <p className="mt-3 max-w-2xl mx-auto text-muted-foreground">
              Aşağıdakı 4 addımı izləyərək bir neçə dəqiqə ərzində ilk xidmətinizi
              yaradıb müştəri qəbul edə bilərsiniz.
            </p>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.step}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-brand/40 hover:shadow-md sm:p-8"
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand/10 transition-transform group-hover:scale-110"
                  />
                  <div className="relative flex items-start gap-5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/40 to-brand/15 ring-1 ring-brand/30">
                      <Icon className="h-7 w-7 text-brand-foreground" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-brand-dark">
                        Addım {step.step}
                      </span>
                      <h3 className="mt-1 text-xl font-semibold">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
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
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-muted/50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Niyə Xidmətal?</h2>
            <p className="mt-3 text-muted-foreground">
              Platformamız xidmət verənlərin işini asanlaşdırmaq üçün yaradılıb
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

      {/* Dashboard preview / workflow */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Kabinetinizdə nə var?</h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Xidmət verən kabineti bütün iş axınınızı bir yerdə cəmləyir. Buradan
                xidmətlərinizi idarə edir, gələn sifarişlərə cavab verir və reytinqinizi
                izləyirsiniz.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  {
                    title: 'Ümumi baxış',
                    text: 'Aktiv xidmətlər, gözləyən sifarişlər və reytinq bir paneldə.',
                  },
                  {
                    title: 'Xidmətlərim',
                    text: 'Yeni xidmət əlavə edin, qiyməti yeniləyin və ya deaktiv edin.',
                  },
                  {
                    title: 'Sifarişlər',
                    text: 'Gözləyən, icradakı və tamamlanan sifarişləri filtrləyin.',
                  },
                  {
                    title: 'Reytinqlər',
                    text: 'Müştəri rəylərini oxuyun və xidmət keyfiyyətinizi təkmilləşdirin.',
                  },
                ].map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/25">
                      <CheckCircle2 className="h-3.5 w-3.5 text-brand-dark" aria-hidden />
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard/provider"
                className={buttonStyles('default', 'md') + ' mt-8'}
              >
                Kabineti aç
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 rounded-3xl bg-gradient-to-br from-brand/20 to-brand/5 blur-2xl"
              />
              <div className="relative rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
                <p className="text-sm font-medium text-muted-foreground">Kabinet önizləməsi</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
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
                <div className="mt-4 rounded-xl border border-dashed border-brand/40 bg-brand/5 px-4 py-6 text-center">
                  <Briefcase className="mx-auto h-8 w-8 text-brand-dark" aria-hidden />
                  <p className="mt-2 text-sm font-medium">Yeni xidmət əlavə et</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Bir neçə dəqiqəyə hazır
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tips */}
      <section className="border-t border-border bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Uğur üçün məsləhətlər</h2>
            <p className="mt-3 text-muted-foreground">
              Təcrübəli xidmət verənlərin ortaq praktikaları
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {tips.map((tip) => {
              const Icon = tip.icon;
              return (
                <div
                  key={tip.title}
                  className="flex gap-4 rounded-xl border border-border/70 bg-card p-5 shadow-sm"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand/15">
                    <Icon className="h-5 w-5 text-brand-dark" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{tip.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {tip.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/20">
              <HelpCircle className="h-6 w-6 text-brand-dark" />
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Tez-tez verilən suallar</h2>
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
      <section className="pb-16 sm:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-brand px-8 py-12 text-center sm:px-16 sm:py-16">
            <h2 className="text-3xl font-bold text-brand-foreground">
              Hazırsınız? İndi başlayın
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-brand-foreground/80">
              Bir neçə dəqiqə ərzində qeydiyyatdan keçin, ilk xidmətinizi yaradın və
              Xidmətal-da minlərlə potensial müştəriyə çatın.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <BecomeProviderLink className="inline-flex items-center gap-2 rounded-lg bg-brand-foreground px-6 py-3 font-medium text-brand transition-colors hover:bg-brand-foreground/90">
                Pulsuz qeydiyyat
                <ArrowRight className="h-5 w-5" />
              </BecomeProviderLink>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg border border-brand-foreground/30 px-6 py-3 font-medium text-brand-foreground transition-colors hover:bg-brand-foreground/10"
              >
                Sualınız var? Bizimlə əlaqə
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
