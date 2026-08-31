import { Suspense } from 'react';
import type { Metadata } from 'next';
import { APP } from '@xidmetal/shared';
import Link from 'next/link';
import {
  Search,
  Shield,
  Clock,
  Star,
  ArrowRight,
  BrushCleaning,
  Wrench,
  Scissors,
  Bug,
  Car,
  Package,
  type LucideIcon,
} from 'lucide-react';
import type { CategorySummary } from '@xidmetal/shared';
import { BecomeProviderLink } from '@/components/auth/become-provider-link';
import { UrgentOrderButton } from '@/components/home/urgent-order-button';
import { HomeCategoriesSkeleton } from '@/components/ui/page-skeletons';
import { api } from '@/lib/api';
import { getCategoryIcon } from '@/lib/category-icons';
import { JsonLd } from '@/components/seo/json-ld';
import {
  buildCategoriesItemListJsonLd,
  buildWebPageJsonLd,
} from '@/lib/seo-schema';
import { pageMetadata } from '@/lib/seo';
import { getSiteUrl } from '@/lib/site-url';
import { FAQ_ITEMS } from '@/lib/faq-items';
import { bakuCategoryPath, PUBLIC_CATEGORY_HUBS } from '@/lib/seo-hubs';

export const revalidate = 60;

export const metadata: Metadata = pageMetadata({
  title: `${APP.name} — lazım olan xidməti asanlıqla tapın`,
  description:
    'Xidmətal xidmət verənlərlə xidmət alanları bir araya gətirən etibarlı platformadır. Təmizlik, təmir, gözəllik və daha çoxu — Bakı və Azərbaycanda bir yerdə.',
  canonical: '/',
  absoluteTitle: true,
});

const FALLBACK_CATEGORIES: {
  icon: LucideIcon;
  name: string;
  slug: string;
  description: string;
}[] = [
  {
    icon: BrushCleaning,
    name: 'Təmizlik',
    slug: 'temizlik',
    description: 'Ev və ofis təmizliyi',
  },
  {
    icon: Wrench,
    name: 'Təmir',
    slug: 'temir',
    description: 'Ev, ofis və avtomobil təmiri',
  },
  {
    icon: Scissors,
    name: 'Gözəllik',
    slug: 'gozellik',
    description: 'Gözəllik və sağlamlıq',
  },
  {
    icon: Bug,
    name: 'Dezinfeksiya',
    slug: 'dezinfeksiya',
    description: 'Dezinfeksiya və sanitariya',
  },
  {
    icon: Car,
    name: 'Nəqliyyat',
    slug: 'neqliyyat',
    description: 'Daşınma və sərnişin daşıma',
  },
  {
    icon: Package,
    name: 'Çatdırılma',
    slug: 'catdirilma',
    description: 'Bağlama və sifariş çatdırılması',
  },
];

const features = [
  {
    icon: Search,
    title: 'Asan axtarış',
    description: 'Kateqoriyalar və axtarış ilə ehtiyacınıza uyğun xidməti tapın.',
  },
  {
    icon: Shield,
    title: 'Etibarlı xidmət verənlər',
    description: 'Yoxlanılmış və reytinqlənmiş xidmət verənlərlə işləyin.',
  },
  {
    icon: Clock,
    title: 'Sürətli sifariş',
    description: 'Bir neçə kliklə xidmət sifariş edin və vaxtınıza qənaət edin.',
  },
  {
    icon: Star,
    title: 'Rəy sistemi',
    description: 'Real istifadəçi rəyləri ilə ən yaxşı seçimi edin.',
  },
];

async function loadCategories(): Promise<CategorySummary[]> {
  try {
    return await api.categories();
  } catch {
    return FALLBACK_CATEGORIES.map((category) => ({
      id: category.slug,
      name: category.name,
      slug: category.slug,
      description: category.description,
      serviceCount: 0,
    }));
  }
}

async function HomeCategories() {
  const categories = await loadCategories();

  const categoryCards =
    categories.length > 0
      ? categories.map((category) => ({
          slug: category.slug,
          name: category.name,
          description: category.description ?? `${category.serviceCount} xidmət`,
          icon: getCategoryIcon(category.slug),
        }))
      : FALLBACK_CATEGORIES.map((category) => ({
          slug: category.slug,
          name: category.name,
          description: category.description,
          icon: category.icon,
        }));

  return (
    <section className="pt-4 pb-12 sm:pt-6 sm:pb-20">
      <JsonLd data={buildCategoriesItemListJsonLd(getSiteUrl(), categoryCards)} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          Xidmətlər
        </h2>

        <div className="-mx-4 sm:-mx-6 lg:-mx-8">
          <div className="scrollbar-none snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth scroll-px-4 sm:scroll-px-6 lg:scroll-px-8">
            <div className="flex w-max gap-3 px-4 py-1 sm:gap-4 sm:px-6 sm:py-3 lg:px-8">
              {categoryCards.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Link
                    key={cat.slug}
                    href={`/categories/${cat.slug}`}
                    prefetch
                    className="group relative flex w-[42vw] max-w-[10.25rem] shrink-0 snap-start touch-manipulation flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm transition-all duration-300 active:scale-[0.98] hover:border-brand/50 hover:shadow-md min-h-[128px] sm:min-h-[168px] sm:w-[11.5rem] sm:max-w-none sm:p-5 sm:active:scale-100 md:w-[12.5rem] lg:w-[calc((min(80rem,100vw-4rem)-5*1rem)/6)]"
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/0 via-brand/0 to-brand/0 opacity-0 transition-opacity duration-300 group-hover:from-brand/8 group-hover:via-brand/4 group-hover:to-transparent group-hover:opacity-100"
                    />

                    <div className="relative flex items-start justify-between gap-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand/35 to-brand/15 ring-1 ring-brand/25 transition-all duration-300 group-hover:scale-105 group-hover:from-brand/50 group-hover:to-brand/25 group-hover:ring-brand/40 sm:h-14 sm:w-14 sm:rounded-2xl">
                        <Icon
                          className="h-5 w-5 text-foreground sm:h-7 sm:w-7"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                      </div>
                      <ArrowRight
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-dark/70 transition-all duration-300 sm:mt-0 sm:hidden sm:group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </div>

                    <div className="relative mt-3 flex flex-1 flex-col sm:mt-4">
                      <span className="text-[13px] font-semibold leading-tight text-foreground transition-colors group-hover:text-brand-dark sm:text-[15px]">
                        {cat.name}
                      </span>
                      <span className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:text-xs sm:leading-relaxed">
                        {cat.description}
                      </span>
                    </div>

                    <ArrowRight
                      className="relative mt-3 hidden h-4 w-4 text-brand-dark opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100 sm:block"
                      aria-hidden
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const siteUrl = getSiteUrl();
  const homeFaqs = FAQ_ITEMS.slice(0, 4);

  return (
    <>
      <JsonLd
        data={buildWebPageJsonLd(siteUrl, {
          name: `${APP.name} — lazım olan xidməti asanlıqla tapın`,
          description:
            'Xidmətal xidmət verənlərlə xidmət alanları bir araya gətirən etibarlı platformadır. Təmizlik, təmir, gözəllik və daha çoxu — Bakı və Azərbaycanda bir yerdə.',
          path: '/',
        })}
      />
      {/* Hero — data gözləmədən dərhal stream olunur */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand/10 to-background">
        <div className="mx-auto max-w-7xl px-4 pt-12 pb-0 sm:px-6 sm:pt-20 lg:px-8 lg:pt-28">
          <div className="text-center">
            <h1 className="w-full text-3xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl lg:leading-tight xl:text-7xl">
              Lazım olan xidməti{' '}
              <span className="text-brand">asanlıqla tapın</span>
            </h1>
            <div className="mx-auto mt-6 max-w-3xl">
              <p className="text-lg text-muted-foreground sm:text-xl">
                Xidmətal xidmət verənlərlə xidmət alanları bir araya gətirən etibarlı
                platformadır. Ev təmiri, təmizlik, gözəllik və daha çoxu — hamısı bir yerdə.
              </p>
              <div className="flex justify-center">
                <UrgentOrderButton />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Suspense fallback={<HomeCategoriesSkeleton />}>
        <HomeCategories />
      </Suspense>

      {/* Features */}
      <section className="bg-muted/50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Niyə Xidmətal?</h2>
            <p className="mt-3 text-muted-foreground">
              Platformamızın üstünlükləri
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-xl bg-card p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand/20">
                  <feature.icon className="h-6 w-6 text-brand-dark" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight">Bakıda xidmətlər</h2>
            <p className="mt-3 text-muted-foreground">
              Ən çox axtarılan kateqoriyalar üzrə Bakı elanlarına birbaşa keçin — qiymət,
              reytinq və rəyləri müqayisə edin.
            </p>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {PUBLIC_CATEGORY_HUBS.map((category) => (
              <li key={category.slug}>
                <Link
                  href={bakuCategoryPath(category.slug)}
                  className="flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-3 py-3 text-center text-sm font-medium transition-colors hover:border-brand/50 hover:text-brand-dark"
                >
                  Bakıda {category.name.toLocaleLowerCase('az')}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm">
            <Link
              href="/how-it-works"
              className="font-medium text-brand-dark underline-offset-2 hover:underline"
            >
              Necə işləyir?
            </Link>
            <span className="text-muted-foreground"> — sifarişdən rəyə qədər 5 addım.</span>
          </p>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight">Tez-tez verilən suallar</h2>
          <div className="mt-8 space-y-3">
            {homeFaqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-xl border border-border bg-card shadow-sm [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium transition-colors hover:text-brand-dark">
                  {faq.question}
                </summary>
                <div className="border-t border-border px-5 py-4 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-sm">
            <Link
              href="/faq"
              className="font-medium text-brand-dark underline-offset-2 hover:underline"
            >
              Bütün suallara bax
            </Link>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-brand px-5 py-10 text-center sm:px-16 sm:py-16">
            <h2 className="text-2xl font-bold text-brand-foreground sm:text-3xl">
              Xidmət verməyə hazırsınız?
            </h2>
            <p className="mt-4 text-brand-foreground/80">
              Xidmət verən kimi qeydiyyatdan keçin və yeni xidmət alanlara çatın.
            </p>
            <BecomeProviderLink className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-foreground px-6 py-3 font-medium text-brand transition-colors hover:bg-brand-foreground/90">
              İndi başla
              <ArrowRight className="h-5 w-5" />
            </BecomeProviderLink>
          </div>
        </div>
      </section>
    </>
  );
}
