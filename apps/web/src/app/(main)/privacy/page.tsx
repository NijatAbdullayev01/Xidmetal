import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Mail, FileText } from 'lucide-react';
import { APP } from '@xidmetal/shared';

export const metadata: Metadata = {
  title: 'Məxfilik siyasəti',
  description:
    'Xidmətal platformasında şəxsi məlumatlarınızın toplanması, istifadəsi, saxlanması və qorunması qaydaları.',
};

const LAST_UPDATED = '10 iyul 2026';

const sections: {
  id: string;
  title: string;
  paragraphs: string[];
  list?: string[];
  subsections?: { title: string; paragraphs: string[]; list?: string[] }[];
}[] = [
  {
    id: 'giris',
    title: '1. Giriş',
    paragraphs: [
      `Bu Məxfilik siyasəti («Siyasət») ${APP.name} platformasının («Platforma», «biz», «bizim») istifadəçilərinin («siz», «istifadəçi») şəxsi məlumatlarının toplanması, emalı, saxlanması və qorunması qaydalarını müəyyən edir.`,
      'Platformadan istifadə etməklə bu Siyasətin şərtləri ilə razılaşmış olursunuz. Siyasətlə razı deyilsinizsə, xahiş edirik Platformadan istifadəni dayandırın.',
      'Bu Siyasət Azərbaycan Respublikasının «Şəxsi məlumatlar haqqında» Qanunu, «Elektron ticarət haqqında» Qanunu və digər tətbiq olunan normativ hüquqi aktlar çərçivəsində hazırlanmışdır.',
    ],
  },
  {
    id: 'terifler',
    title: '2. Təriflər',
    paragraphs: ['Bu Siyasətdə aşağıdakı terminlərdən istifadə olunur:'],
    list: [
      'Şəxsi məlumat — birbaşa və ya dolayı yolla müəyyən bir fiziki şəxsi identifikasiya etməyə imkan verən hər hansı məlumat.',
      'Məlumat subyekti — şəxsi məlumatları təqdim edən və ya onun haqqında məlumat toplanan fiziki şəxs (Platforma istifadəçisi).',
      'Məlumat operatoru — şəxsi məlumatların toplanması və emalının məqsəd və vasitələrini müəyyən edən Xidmətal platformasının idarəçisi.',
      'Emal — şəxsi məlumatlar üzərində aparılan hər hansı əməliyyat (toplama, saxlama, istifadə, ötürmə, silmə və s.).',
      'Xidmət verən — Platformada xidmət təklif edən istifadəçi.',
      'Xidmət alan (Customer) — Platformada xidmət sifariş edən istifadəçi.',
    ],
  },
  {
    id: 'operator',
    title: '3. Məlumat operatoru',
    paragraphs: [
      'Şəxsi məlumatlarınızın məlumat operatoru Xidmətal platformasının idarəçisidir.',
      'Məxfilik və şəxsi məlumatlarla bağlı sorğularınızı aşağıdakı əlaqə vasitələri ilə ünvanlaya bilərsiniz:',
    ],
    list: [
      'E-poçt: privacy@xidmetal.az',
      'Ünvan: Bakı, Azərbaycan',
      'Əlaqə forması: /contact səhifəsi vasitəsilə',
    ],
  },
  {
    id: 'toplanan-melumatlar',
    title: '4. Toplanan şəxsi məlumatlar',
    paragraphs: [
      'Platformanın funksionallığını təmin etmək məqsədilə aşağıdakı kateqoriyalarda məlumat toplaya bilərik:',
    ],
    subsections: [
      {
        title: '4.1. Qeydiyyat və hesab məlumatları',
        paragraphs: ['Hesab yaratdığınız zaman:'],
        list: [
          'Ad və soyad',
          'E-poçt ünvanı',
          'Telefon nömrəsi (istəyə bağlı)',
          'Parol (yalnız şifrələnmiş (hash) formada saxlanılır)',
          'İstifadəçi rolu (müştəri, xidmət verən və ya administrator)',
          'Profil şəkli (avatar)',
        ],
      },
      {
        title: '4.2. Xidmət verən profili məlumatları',
        paragraphs: ['Xidmət verən kimi qeydiyyatdan keçdiyiniz halda əlavə olaraq:'],
        list: [
          'Bioqrafiya (bio)',
          'Təcrübə müddəti',
          'Xidmət göstərilən yer/ünvan',
          'Təklif etdiyiniz xidmətlər haqqında məlumat (başlıq, təsvir, qiymət, müddət)',
          'Xidmət şəkilləri',
          'Reytinq və rəy statistikası',
        ],
      },
      {
        title: '4.3. Sifariş və əməliyyat məlumatları',
        paragraphs: ['Sifariş verdikdə və ya qəbul etdiyinizdə:'],
        list: [
          'Sifariş tarixi və vaxtı',
          'Xidmət ünvanı',
          'Sifariş qeydləri (notes)',
          'Sifariş statusu və qiymət məlumatları',
          'Ödənişlə bağlı əməliyyat məlumatları (tətbiq olunduqda)',
        ],
      },
      {
        title: '4.4. Rəy və qiymətləndirmə məlumatları',
        paragraphs: ['Tamamlanmış sifarişlər üzrə:'],
        list: ['Reytinq (ulduz sayı)', 'Rəy mətni', 'Rəyin yaradılma tarixi'],
      },
      {
        title: '4.5. Texniki və avtomatik toplanan məlumatlar',
        paragraphs: ['Platformadan istifadə zamanı avtomatik olaraq:'],
        list: [
          'IP ünvanı',
          'Brauzer və cihaz məlumatları',
          'Əməliyyat sistemi',
          'Giriş tarixi və vaxtı',
          'Səhifə baxışları və Platforma daxilindəki fəaliyyət',
          'Kukilər və oxşar izləmə texnologiyaları vasitəsilə toplanan məlumatlar',
        ],
      },
      {
        title: '4.6. Əlaqə və dəstək məlumatları',
        paragraphs: ['Bizimlə əlaqə saxladığınız zaman:'],
        list: [
          'Ad, soyad',
          'E-poçt ünvanı',
          'Mesajın məzmunu',
          'Müraciətin tarixi',
        ],
      },
    ],
  },
  {
    id: 'meqsedler',
    title: '5. Məlumatların toplanması məqsədləri və hüquqi əsasları',
    paragraphs: ['Şəxsi məlumatlarınızı aşağıdakı məqsədlərlə emal edirik:'],
    list: [
      'Hesabınızın yaradılması, idarə edilməsi və autentifikasiya (giriş) prosesinin təmin edilməsi',
      'Xidmət axtarışı, sifariş verilməsi və sifarişlərin idarə edilməsi',
      'Xidmət verənlərlə xidmət alanlar arasında əlaqənin qurulması',
      'Reytinq və rəy sisteminin işlədilməsi',
      'Platforma təhlükəsizliyinin təmin edilməsi və fırıldaqçılığın qarşısının alınması',
      'Texniki dəstək göstərilməsi və istifadəçi sorğularına cavab verilməsi',
      'Platformanın təkmilləşdirilməsi və istifadəçi təcrübəsinin yaxşılaşdırılması',
      'Hüquqi öhdəliklərimizin yerinə yetirilməsi',
      'Sizin açıq razılığınız olduqda — marketinq və məlumatlandırma mesajlarının göndərilməsi',
    ],
    subsections: [
      {
        title: 'Hüquqi əsaslar',
        paragraphs: ['Məlumatların emalı aşağıdakı hüquqi əsaslarla həyata keçirilir:'],
        list: [
          'Məlumat subyektinin razılığı',
          'Müqavilənin (istifadəçi ilə bağlanan ictimai oferta) icrası üçün zəruri olması',
          'Məlumat operatorunun qanuni maraqlarının qorunması',
          'Qanunvericiliklə nəzərdə tutulmuş öhdəliklərin yerinə yetirilməsi',
        ],
      },
    ],
  },
  {
    id: 'istifade',
    title: '6. Məlumatların istifadəsi',
    paragraphs: [
      'Toplanan şəxsi məlumatlar yalnız yuxarıda göstərilən məqsədlər çərçivəsində və qanunvericiliyin tələblərinə uyğun olaraq istifadə olunur.',
      'Şəxsi məlumatlarınızı qanunsuz reklam, spam göndərişi və ya icazə verilməyən kommersiya məqsədləri üçün istifadə etmirik.',
      'Xidmət verən və xidmət alan arasında sifarişin icrası üçün zəruri olan əlaqə məlumatları (məsələn, ad, telefon, ünvan) müvafiq tərəflərlə paylaşıla bilər.',
    ],
  },
  {
    id: 'paylasma',
    title: '7. Məlumatların üçüncü tərəflərlə paylaşılması',
    paragraphs: [
      'Şəxsi məlumatlarınızı satmırıq və icazəsiz olaraq üçüncü tərəflərə ötürmirik. Aşağıdakı hallarda məhdud şəkildə paylaşım mümkündür:',
      'Üçüncü tərəf xidmət provayderləri məlumatları yalnız bizim tapşırığımız əsasında və müvafiq təhlükəsizlik tədbirləri ilə emal edir.',
    ],
    list: [
      'Xidmətin icrası üçün: sifariş zamanı xidmət verən və xidmət alan bir-birinin zəruri əlaqə məlumatlarına çıxış əldə edir',
      'Texniki tərəfdaşlar: server hostinqi, e-poçt xidmətləri, analitika və təhlükəsizlik provayderləri (məlumatların məxfiliyi müqavilələri ilə)',
      'Hüquqi tələblər: məhkəmə qərarı, dövlət orqanlarının qanuni tələbi və ya qanunvericiliyin tələbi olduqda',
      'Biznes transferi: birləşmə, alınma və ya aktivlərin satışı halında — məlumat subyektlərinə əvvəlcədən məlumat verilməklə',
    ],
  },
  {
    id: 'saxlanma',
    title: '8. Məlumatların saxlanması müddəti',
    paragraphs: [
      'Şəxsi məlumatlar yalnız toplanma məqsədinin tələb etdiyi müddət ərzində və ya qanunvericiliklə müəyyən edilmiş müddət boyunca saxlanılır.',
      'Hesabınız aktiv olduğu müddətcə əsas profil məlumatlarınız saxlanılır. Hesabınızı silmək istədiyiniz halda, qanuni saxlama öhdəlikləri istisna olmaqla, məlumatlarınız silinir və ya anonimləşdirilir.',
      'Maliyyə və vergi qanunvericiliyi tələblərinə uyğun olaraq müəyyən əməliyyat məlumatları müvafiq müddət ərzində arxivləşdirilə bilər.',
      'Texniki loglar təhlükəsizlik məqsədləri üçün məhdud müddət saxlanılır.',
    ],
  },
  {
    id: 'huquqlar',
    title: '9. Məlumat subyektinin hüquqları',
    paragraphs: [
      'Azərbaycan Respublikasının qanunvericiliyinə uyğun olaraq aşağıdakı hüquqlara maliksiniz:',
      'Hüquqlarınızı həyata keçirmək üçün privacy@xidmetal.az ünvanına yazın və ya əlaqə formasından istifadə edin. Sorğunuza 30 (otuz) təqvim günü ərzində cavab verəcəyik.',
      'Şəxsi məlumatlarınızın bir hissəsini hesab parametrləri bölməsindən birbaşa yeniləyə və ya silə bilərsiniz.',
    ],
    list: [
      'Şəxsi məlumatlarınızın emal edilib-edilmədiyi barədə məlumat almaq',
      'Şəxsi məlumatlarınıza çıxış əldə etmək',
      'Dəqiq olmayan və ya natamam məlumatların düzəldilməsini tələb etmək',
      'Məlumatların silinməsini tələb etmək («unudulmaq hüququ»)',
      'Emala verdiyiniz razılığı geri götürmək',
      'Məlumatların emalının məhdudlaşdırılmasını tələb etmək',
      'Şəxsi məlumatlarınızın strukturlaşdırılmış formada əldə edilməsini tələb etmək',
      'Məlumatların qanunsuz emal edildiyini hesab etdiyiniz halda şikayət etmək',
    ],
  },
  {
    id: 'kukiler',
    title: '10. Kukilər və izləmə texnologiyaları',
    paragraphs: [
      'Platforma funksionallığını təmin etmək, sessiyanı saxlamaq, təhlükəsizliyi artırmaq və istifadəçi təcrübəsini yaxşılaşdırmaq üçün kukilərdən istifadə edirik.',
      'Brauzer parametrlərindən kukiləri idarə edə və ya silə bilərsiniz. Zəruri kukiləri söndürmək Platformanın düzgün işləməməsinə səbəb ola bilər.',
    ],
    subsections: [
      {
        title: 'İstifadə etdiyimiz kuki növləri',
        paragraphs: [],
        list: [
          'Zəruri kukilər — Platformanın əsas funksiyalarının işləməsi üçün (məsələn, autentifikasiya sessiyası)',
          'Funksional kukilər — seçimlərinizin yadda saxlanması üçün',
          'Analitik kukilər — Platformadan istifadə statistikalarının toplanması üçün (anonimləşdirilmiş)',
        ],
      },
    ],
  },
  {
    id: 'tehlukesizlik',
    title: '11. Təhlükəsizlik tədbirləri',
    paragraphs: [
      'Şəxsi məlumatlarınızın qorunması üçün texniki və təşkilati tədbirlər görürük:',
      'Heç bir ötürmə və ya saxlama üsulu tam təhlükəsiz deyil. Məlumat pozuntusu baş verdikdə qanunvericiliyin tələb etdiyi qaydada sizi və müvafiq orqanları məlumatlandıracağıq.',
    ],
    list: [
      'Parolların kriptoqrafik hash alqoritmləri ilə saxlanması',
      'HTTPS (SSL/TLS) şifrələmə ilə məlumat ötürülməsi',
      'Giriş tokenlərinin (JWT) təhlükəsiz idarə edilməsi və refresh token rotasiyası',
      'Məlumat bazasına məhdud giriş və rol əsaslı icazə sistemi',
      'Müntəzəm təhlükəsizlik yeniləmələri və monitorinq',
      'İşçilərin məxfilik öhdəlikləri ilə tanış edilməsi',
    ],
  },
  {
    id: 'usaq',
    title: '12. Uşaqların məxfiliyi',
    paragraphs: [
      'Platforma 18 yaşından kiçik şəxslər üçün nəzərdə tutulmayıb. Bilərəkdən 18 yaşından kiçik şəxslərdən şəxsi məlumat toplamırıq.',
      'Belə məlumatın toplandığını aşkar etdiyimiz halda, qanuni tələblərə uyğun olaraq dərhal silinməsi üçün tədbir görəcəyik.',
    ],
  },
  {
    id: 'beynelxalq',
    title: '13. Beynəlxalq məlumat ötürülməsi',
    paragraphs: [
      'Məlumatlarınız əsasən Azərbaycan Respublikasının ərazisində və ya Avropa İqtisadi Sahəsi (AİS) standartlarına uyğun təhlükəsizlik tədbirləri olan serverlərdə saxlanıla bilər.',
      'Məlumatların xarici ölkələrə ötürülməsi zəruri olduqda, müvafiq hüquqi təminatlar (məxfilik müqavilələri, standart müqavilə bəndləri) tətbiq olunur.',
    ],
  },
  {
    id: 'deyisiklikler',
    title: '14. Siyasətin dəyişdirilməsi',
    paragraphs: [
      'Bu Siyasəti vaxtaşırı yeniləyə bilərik. Dəyişikliklər Platformada dərc edildiyi andan qüvvəyə minir.',
      'Mühüm dəyişikliklər barədə e-poçt və ya Platforma daxilində bildiriş vasitəsilə sizi məlumatlandıracağıq.',
      'Dəyişikliklərdən sonra Platformadan istifadəni davam etdirməyiniz yenilənmiş Siyasətlə razılaşdığınızı bildirir.',
    ],
  },
  {
    id: 'elaqe',
    title: '15. Əlaqə',
    paragraphs: [
      'Məxfilik siyasəti və şəxsi məlumatlarınızın emalı ilə bağlı sual, şikayət və ya müraciətlərinizi aşağıdakı ünvanlara göndərə bilərsiniz:',
      'Müraciətlərinizə qanunvericiliklə müəyyən edilmiş müddətlərdə cavab veriləcəkdir.',
    ],
    list: [
      'Məxfilik üzrə e-poçt: privacy@xidmetal.az',
      'Ümumi əlaqə: info@xidmetal.az',
      'Ünvan: Bakı, Azərbaycan',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand/15 via-brand/5 to-background">
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/40 to-brand/15 ring-1 ring-brand/30">
              <Shield className="h-7 w-7 text-brand-foreground" strokeWidth={1.75} aria-hidden />
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Məxfilik <span className="text-brand">siyasəti</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              {APP.name} platformasında şəxsi məlumatlarınızın necə toplandığı, istifadə
              edildiyi və qorunduğu barədə ətraflı məlumat.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Son yenilənmə: <time dateTime="2026-07-10">{LAST_UPDATED}</time>
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12">
            {/* Table of contents */}
            <nav
              aria-label="Mündəricat"
              className="lg:col-span-3 lg:sticky lg:top-24 lg:self-start"
            >
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-dark" aria-hidden />
                  <h2 className="text-sm font-semibold">Mündəricat</h2>
                </div>
                <ol className="mt-4 space-y-2 text-sm">
                  {sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="text-muted-foreground transition-colors hover:text-brand-dark"
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </nav>

            {/* Legal content */}
            <article className="lg:col-span-9">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Bu sənəd {APP.name} platformasının istifadəçilərinin şəxsi məlumatlarının
                  mühafizəsi ilə bağlı hüquqi çərçivəni müəyyən edir. Sənəd Azərbaycan
                  Respublikasının mövcud qanunvericiliyinə uyğun hazırlanmışdır.
                </p>

                <div className="mt-10 space-y-12">
                  {sections.map((section) => (
                    <section key={section.id} id={section.id} className="scroll-mt-24">
                      <h2 className="text-xl font-bold tracking-tight">{section.title}</h2>

                      {section.paragraphs.map((paragraph, index) => (
                        <p
                          key={index}
                          className="mt-4 text-sm leading-relaxed text-muted-foreground"
                        >
                          {paragraph}
                        </p>
                      ))}

                      {section.list && (
                        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                          {section.list.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      )}

                      {section.subsections?.map((subsection) => (
                        <div key={subsection.title} className="mt-6">
                          <h3 className="text-base font-semibold">{subsection.title}</h3>
                          {subsection.paragraphs.map((paragraph, index) => (
                            <p
                              key={index}
                              className="mt-3 text-sm leading-relaxed text-muted-foreground"
                            >
                              {paragraph}
                            </p>
                          ))}
                          {subsection.list && (
                            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                              {subsection.list.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </section>
                  ))}
                </div>
              </div>

              {/* Contact CTA */}
              <div className="mt-8 rounded-2xl border border-brand/30 bg-brand/10 p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/30">
                    <Mail className="h-5 w-5 text-brand-foreground" aria-hidden />
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-foreground">
                      Məxfiliklə bağlı sualınız var?
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-brand-foreground/80">
                      Şəxsi məlumatlarınızın emalı barədə sual və ya müraciətinizi{' '}
                      <a
                        href="mailto:privacy@xidmetal.az"
                        className="font-medium underline underline-offset-2 hover:text-brand-foreground"
                      >
                        privacy@xidmetal.az
                      </a>{' '}
                      ünvanına göndərə və ya{' '}
                      <Link
                        href="/contact"
                        className="font-medium underline underline-offset-2 hover:text-brand-foreground"
                      >
                        əlaqə səhifəmizdən
                      </Link>{' '}
                      bizimlə əlaqə saxlaya bilərsiniz.
                    </p>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
