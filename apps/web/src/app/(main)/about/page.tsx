import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Target,
  Eye,
  Heart,
  Users,
  Shield,
  Sparkles,
  Handshake,
  MapPin,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { APP } from '@xidmetal/shared';
import { BecomeProviderLink } from '@/components/auth/become-provider-link';

export const metadata: Metadata = {
  title: 'Haqqımızda | Xidmətal',
  description:
    'Xidmətal haqqında — missiyamız, dəyərlərimiz və xidmət verənlərlə xidmət alanları necə birləşdirdiyimiz barədə məlumat.',
};

const stats = [
  { value: '1000+', label: 'Aktiv xidmət' },
  { value: '500+', label: 'Xidmət verən' },
  { value: '50+', label: 'Kateqoriya' },
  { value: '4.8 ★', label: 'Orta reytinq' },
];

const values: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: Heart,
    title: 'İnsan mərkəzli yanaşma',
    description:
      'Hər qərarımızda istifadəçi təcrübəsini ön planda tuturuq. Həm xidmət alan, həm də xidmət verən üçün sadə və aydın proseslər yaradırıq.',
  },
  {
    icon: Shield,
    title: 'Etibar və şəffaflıq',
    description:
      'Sifarişlər, qiymətlər və rəylər açıq şəkildə göstərilir. Platformada etibarlı mühit yaratmaq bizim əsas prioritetimizdir.',
  },
  {
    icon: Sparkles,
    title: 'Keyfiyyətə həsr',
    description:
      'Yalnız keyfiyyətli xidmət təklif edən xidmət verənləri dəstəkləyirik. Reytinq sistemi hər kəsin daha yaxşı seçim etməsinə kömək edir.',
  },
  {
    icon: Handshake,
    title: 'Bərabər tərəfdaşlıq',
    description:
      'Xidmət verənləri yalnız siyahıda göstərmirik — onların biznesini böyütməyə, yeni müştərilərə çatmağa kömək edirik.',
  },
];

const forWhom: {
  title: string;
  audience: string;
  points: string[];
}[] = [
  {
    title: 'Xidmət alanlar üçün',
    audience: 'Evdə, ofisdə və ya gündəlik həyatda ehtiyac duyduğunuz xidmətləri tapın.',
    points: [
      'Kateqoriyalar üzrə asan axtarış və filtrləmə',
      'Reytinq və rəylər əsasında müqayisə',
      'Bir neçə kliklə sifariş və izləmə',
      'Etibarlı və yoxlanılmış xidmət verənlər',
    ],
  },
  {
    title: 'Xidmət verənlər üçün',
    audience: 'Bacarıqlarınızı monetizasiya edin və yeni müştərilərə çatın.',
    points: [
      'Pulsuz qeydiyyat və xidmət əlavəsi',
      'Sifarişləri bir kabinetdən idarəetmə',
      'Reytinq və rəylərlə görünürlüyün artması',
      'Öz cədvəlinizə və qiymətinizə nəzarət',
    ],
  },
];

const milestones: {
  year: string;
  title: string;
  description: string;
}[] = [
  {
    year: '2024',
    title: 'İdeya və planlaşdırma',
    description:
      'Azərbaycanda xidmət bazarında etibarlı, rəqəmsal həll yaratmaq ideyası formalaşdı. İstifadəçi ehtiyacları araşdırıldı.',
  },
  {
    year: '2025',
    title: 'Platformanın qurulması',
    description:
      'Xidmətal platforması hazırlandı — xidmət axtarışı, sifariş, xidmət verən kabineti və reytinq sistemi bir ekosistemdə birləşdirildi.',
  },
  {
    year: '2026',
    title: 'İnkişaf və genişlənmə',
    description:
      'Kateqoriyalar genişləndirilir, yeni funksiyalar əlavə olunur və daha çox istifadəçiyə keyfiyyətli xidmət təcrübəsi təqdim edilir.',
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand/15 via-brand/5 to-background">
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              <span className="text-brand">{APP.name}</span> haqqında
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              {APP.description}. Biz hər kəsin ehtiyac duyduğu xidməti tez, asan və
              etibarlı şəkildə tapmasını, xidmət verənlərin isə bacarıqlarını geniş auditoriyaya
              çatdırmasını hədəfləyirik.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((item) => (
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

      {/* Mission & Vision */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <article className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/40 to-brand/15 ring-1 ring-brand/30">
                <Target className="h-7 w-7 text-brand-foreground" strokeWidth={1.75} />
              </div>
              <h2 className="mt-6 text-2xl font-bold">Missiyamız</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Xidmət axtaran insanlarla keyfiyyətli xidmət təklif edən peşəkarları bir
                platformada birləşdirmək. Texnologiyadan istifadə edərək hər iki tərəf üçün
                vaxta, pula və enerjiyə qənaət edən, şəffaf və etibarlı bir ekosistem yaratmaq.
              </p>
            </article>

            <article className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/40 to-brand/15 ring-1 ring-brand/30">
                <Eye className="h-7 w-7 text-brand-foreground" strokeWidth={1.75} />
              </div>
              <h2 className="mt-6 text-2xl font-bold">Vizyonumuz</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Azərbaycanda və regionda aparıcı xidmət marketplace-i olmaq — hər ev,
                ofis və biznesin ehtiyac duyduğu xidməti bir kliklə tapa biləcəyi, xidmət
                verənlərin isə rəqəmsal iqtisadiyyatın bir parçası kimi böyüyə biləcəyi
                platforma.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="border-t border-border bg-muted/50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Hekayəmiz</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Xidmətal, gündəlik həyatda xidmət tapmağın çətin olduğu, xidmət verənlərin isə
              müştəri tapmaqda çətinlik çəkdiyi bir reallıqdan doğulub. Təmizlik, təmir,
              gözəllik, təhsil və daha onlarla kateqoriyada etibarlı xidmət verən tapmaq çox vaxt
              tanışlıq və ya təsadüfi axtarışlara bağlı idi.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Biz bu boşluğu doldurmaq üçün platforma yaratdıq: bir tərəfdə ehtiyacı olan
              müştəri, digər tərəfdə bacarıqlı xidmət verən — aralarında isə aydın qiymət,
              reytinq və sifariş idarəetməsi. Bu gün Xidmətal minlərlə istifadəçiyə xidmət
              göstərir və davamlı inkişaf edir.
            </p>
          </div>

          <div className="mt-14 space-y-6">
            {milestones.map((milestone, index) => (
              <div
                key={milestone.year}
                className="relative flex gap-6 rounded-xl border border-border/70 bg-card p-6 shadow-sm sm:p-8"
              >
                <div className="flex shrink-0 flex-col items-center">
                  <span className="text-sm font-bold text-brand-dark">{milestone.year}</span>
                  {index < milestones.length - 1 && (
                    <div
                      aria-hidden
                      className="mt-2 hidden h-full w-px bg-border sm:block"
                    />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{milestone.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {milestone.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Dəyərlərimiz</h2>
            <p className="mt-3 text-muted-foreground">
              Platformamızı formalaşdıran prinsiplər
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <div
                  key={value.title}
                  className="rounded-xl bg-card p-6 shadow-sm ring-1 ring-border/50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand/20">
                    <Icon className="h-6 w-6 text-brand-dark" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{value.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* For whom */}
      <section className="border-t border-border bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/20">
              <Users className="h-6 w-6 text-brand-dark" />
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Kimlər üçün?</h2>
            <p className="mt-3 text-muted-foreground">
              Xidmətal həm xidmət alan, həm də xidmət verən üçün faydalıdır
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {forWhom.map((group) => (
              <article
                key={group.title}
                className="rounded-2xl border border-border bg-card p-8 shadow-sm"
              >
                <h3 className="text-xl font-semibold">{group.title}</h3>
                <p className="mt-2 text-muted-foreground">{group.audience}</p>
                <ul className="mt-6 space-y-3">
                  {group.points.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sm">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark"
                        aria-hidden
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Location note */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-8 py-10 text-center shadow-sm sm:px-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/20">
              <MapPin className="h-7 w-7 text-brand-dark" />
            </div>
            <h2 className="mt-6 text-2xl font-bold">Azərbaycan üçün, Azərbaycandan</h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
              Xidmətal yerli bazarın ehtiyaclarına uyğun yaradılıb. Platforma Azərbaycan
              dilindədir, yerli ödəniş və əlaqə imkanları nəzərə alınır və istifadəçilər
              öz şəhər və rayonlarına uyğun xidmət tapa bilirlər.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-16 sm:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-brand px-8 py-12 text-center sm:px-16 sm:py-16">
            <h2 className="text-3xl font-bold text-brand-foreground">
              Bizə qoşulun
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-brand-foreground/80">
              Xidmət axtarırsınızsa indi kəşf edin, xidmət təklif edirsinizsə pulsuz
              qeydiyyatdan keçib ilk müştərilərinizə çatın.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/services"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-brand-foreground px-6 text-base font-medium text-brand transition-colors hover:bg-brand-foreground/90"
              >
                Xidmətlərə bax
                <ArrowRight className="h-5 w-5" />
              </Link>
              <BecomeProviderLink className="inline-flex h-12 items-center gap-2 rounded-lg border border-brand-foreground/30 px-6 text-base font-medium text-brand-foreground transition-colors hover:bg-brand-foreground/10">
                Xidmət verən ol
              </BecomeProviderLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
