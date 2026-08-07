import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, HelpCircle } from 'lucide-react';
import { APP } from '@xidmetal/shared';

export const metadata: Metadata = {
  title: 'Tez-tez verilən suallar | Xidmətal',
  description: `${APP.name} platforması haqqında ən çox soruşulan suallar və cavablar.`,
};

const faqs: { question: string; answer: string }[] = [
  {
    question: 'Sifariş vermək üçün qeydiyyat lazımdır?',
    answer:
      'Bəli, sifariş göndərmək üçün pulsuz hesab yaratmaq lazımdır. Bu, sifarişinizi izləməyinizə və xidmət verənlə əlaqə saxlamanıza imkan verir.',
  },
  {
    question: 'Sifariş göndərdikdən sonra nə baş verir?',
    answer:
      'Sifarişiniz xidmət verənə çatır və «Gözləyir» statusunda görünür. Xidmət verən təsdiqlədikdən sonra status «Təsdiqləndi» və sonra «İcrada» olur. Prosesi kabinetinizdən izləyə bilərsiniz.',
  },
  {
    question: 'Qiymət necə müəyyən edilir?',
    answer:
      'Hər xidmətin qiyməti xidmət verən tərəfindən təyin olunur. Sabit, saatlıq və ya günlük qiymət tipi xidmət səhifəsində göstərilir. Sifariş vermədən əvvəl qiyməti görə bilərsiniz.',
  },
  {
    question: 'Sifarişi ləğv edə bilərəm?',
    answer:
      'Bəli, müəyyən mərhələlərdə sifarişi ləğv etmək mümkündür. Ləğv şərtləri sifariş statusundan asılıdır — kabinetinizdən idarə edə bilərsiniz.',
  },
  {
    question: 'Xidmət verən olmaq istəyirəm, haradan başlamalıyam?',
    answer:
      '«Xidmət verən ol» düyməsinə klikləyərək pulsuz qeydiyyatdan keçin. Ətraflı addım-addım təlimat üçün Xidmət verən bələdçisi səhifəsinə baxın.',
  },
  {
    question: 'Platforma komissiya və ya ödəniş alır?',
    answer:
      'Xeyr. Hal-hazırda Xidmətal xidmət verənlərdən və müştərilərdən platforma haqqı / komissiya tutmur. Kartla onlayn ödəniş də yoxdur — xidmət haqqı tərəflər arasında birbaşa (nağd və ya digər razılaşma) ödənilir.',
  },
  {
    question: 'Rəy yazmaq məcburidirmi?',
    answer:
      'Xeyr, məcburi deyil. Lakin rəy yazmaq digər istifadəçilərə kömək edir və platformada keyfiyyətli xidmət verənlərin seçilməsini asanlaşdırır.',
  },
];

export default function FaqPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand/15 via-brand/5 to-background">
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/20">
              <HelpCircle className="h-6 w-6 text-brand-dark" aria-hidden />
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Tez-tez verilən <span className="text-brand">suallar</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              {APP.name} platforması haqqında ən çox soruşulan suallar və cavablar
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-3">
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

          <div className="mt-12 rounded-xl border border-border bg-card p-6 text-center shadow-sm">
            <p className="text-muted-foreground">
              Cavabını tapa bilmədiniz? Bizimlə birbaşa əlaqə saxlayın.
            </p>
            <Link
              href="/contact"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-dark transition-colors hover:text-brand"
            >
              Əlaqə səhifəsinə keç
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
