import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Mail, FileText } from 'lucide-react';
import { APP } from '@xidmetal/shared';
import { PageBreadcrumbs } from '@/components/layout/breadcrumbs';
import { JsonLd } from '@/components/seo/json-ld';
import { pageMetadata } from '@/lib/seo';
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from '@/lib/seo-schema';
import { getSiteUrl } from '@/lib/site-url';

export const metadata: Metadata = pageMetadata({
  title: 'Məxfilik siyasəti',
  description:
    'Xidmətal platformasında şəxsi məlumatlarınızın toplanması, istifadəsi, saxlanması və qorunması qaydaları.',
  canonical: '/privacy',
});

const LAST_UPDATED = '31 avqust 2026';

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
      'Platformadan istifadə etməklə bu Siyasətin şərtləri ilə tanış olduğunuzu və razılaşdığınızı təsdiq edirsiniz. Siyasətlə razı deyilsinizsə, Platformadan istifadəni dayandırın.',
      'Bu Siyasət Azərbaycan Respublikasının «Şəxsi məlumatlar haqqında» Qanunu, «Elektron ticarət haqqında» Qanunu, «İnformasiya, informasiyalaşdırma və informasiyanın mühafizəsi haqqında» Qanunu və digər tətbiq olunan normativ hüquqi aktlar çərçivəsində hazırlanmışdır.',
    ],
  },
  {
    id: 'terifler',
    title: '2. Təriflər',
    paragraphs: ['Bu Siyasətdə aşağıdakı terminlərdən istifadə olunur:'],
    list: [
      'Şəxsi məlumat — birbaşa və ya dolayı yolla müəyyən bir fiziki şəxsi identifikasiya etməyə imkan verən hər hansı məlumat.',
      'Məlumat subyekti — şəxsi məlumatları təqdim edən və ya onun haqqında məlumat toplanan fiziki şəxs (Platforma istifadəçisi).',
      'Məlumat operatoru — şəxsi məlumatların toplanması və emalının məqsəd və vasitələrini müəyyən edən, Platformanı idarə edən şəxs.',
      'Emal — şəxsi məlumatlar üzərində aparılan hər hansı əməliyyat (toplama, saxlama, istifadə, ötürmə, silmə və s.).',
      'Xidmət verən — Platformada xidmət təklif edən istifadəçi.',
      'Xidmət alan — Platformada xidmət sifariş edən istifadəçi.',
    ],
  },
  {
    id: 'operator',
    title: '3. Məlumat operatoru',
    paragraphs: [
      'Şəxsi məlumatlarınızın məlumat operatoru Xidmətal platformasını idarə edən şəxsdir. Hüquqi şəxs məlumatları (ad, uçot nömrəsi, hüquqi ünvan) qanunvericilik tələb etdikdə və ya dərc olunduqda bu Siyasətə əlavə ediləcək.',
      'Məxfilik və şəxsi məlumatlarla bağlı sorğularınızı aşağıdakı əlaqə vasitələri ilə ünvanlaya bilərsiniz:',
    ],
    list: [
      'E-poçt: info@xidmetal.com',
      'Ünvan: Bakı, Azərbaycan',
      'Əlaqə səhifəsi vasitəsilə yazılı müraciət',
    ],
  },
  {
    id: 'toplanan-melumatlar',
    title: '4. Toplanan şəxsi məlumatlar',
    paragraphs: [
      'Platformanın funksiyalarını təmin etmək məqsədilə yalnız zəruri həcmdə aşağıdakı kateqoriyalarda məlumat toplaya bilərik. Hansı məlumatın toplanması sizin rolunuzdan və istifadə etdiyiniz funksiyalardan asılıdır.',
    ],
    subsections: [
      {
        title: '4.1. Qeydiyyat və hesab məlumatları',
        paragraphs: ['Hesab yaratdığınız zaman:'],
        list: [
          'Ad və soyad',
          'E-poçt ünvanı',
          'Telefon nömrəsi',
          'Parol (yalnız bərpa olunmayan şifrələnmiş formada saxlanılır)',
          'İstifadəçi rolu (xidmət alan, xidmət verən və ya inzibatçı)',
          'Profil şəkli',
        ],
      },
      {
        title: '4.2. Xidmət verən profili məlumatları',
        paragraphs: ['Xidmət verən kimi qeydiyyatdan keçdiyiniz halda əlavə olaraq:'],
        list: [
          'Qısa təqdimat mətni',
          'Təcrübə müddəti',
          'Xidmət göstərilən yer və ünvan',
          'Hesab növü (fiziki şəxs və ya hüquqi şəxs) və şirkət adı (göstərildikdə)',
          'Təklif etdiyiniz xidmətlər haqqında məlumat (başlıq, təsvir, qiymət, müddət, xidmət yeri)',
          'Xidmət şəkilləri',
          'Kimlik təsdiqi üçün sənəd şəkilləri (şəxsiyyət vəsiqəsinin üz və arxa tərəfi, özünüzün şəkli) — yoxlama məqsədilə',
          'Reytinq və rəy statistikası',
        ],
      },
      {
        title: '4.3. Sifariş və əməliyyat məlumatları',
        paragraphs: ['Sifariş verdikdə və ya qəbul etdiyinizdə:'],
        list: [
          'Sifariş tarixi, vaxtı və növü (planlaşdırılmış və ya təcili)',
          'Xidmət ünvanı və (verildikdə) təyinat koordinatları',
          'Sifariş qeydləri və əlavə şəkillər',
          'Sifariş statusu, qiymət və ləğv səbəbi',
          'Təyin olunmuş komanda (şirkət hesabı olduqda)',
          'Ödənişlə bağlı əməliyyat məlumatları (yalnız belə funksiya gələcəkdə aktiv olduqda)',
        ],
      },
      {
        title: '4.4. Mesajlaşma və bildirişlər',
        paragraphs: ['Sifarişlə bağlı yazışma və bildirişlər üçün:'],
        list: [
          'Mesajların mətni və göndərilmə vaxtı',
          'Söhbətə əlavə olunan şəkillər (göndərildikdə)',
          'Cihaz bildiriş nişanı — bildirişlərin çatdırılması üçün',
        ],
      },
      {
        title: '4.5. Yer və hərəkət məlumatları',
        paragraphs: [
          'Təcili sifariş, yaxınlıqdakı xidmət verənin tapılması və yolda olma statusu üçün yer məlumatı emal oluna bilər:',
        ],
        list: [
          'Xidmət alanın göstərdiyi xidmət ünvanı və (verildikdə) təyinat koordinatları',
          'Xidmət verənin xidmətə açıq və ya yolda olduğu zaman cihazdan alınan təxmini mövqe (coğrafi enlik və uzunluq)',
          'Sifarişə aid mövqe yeniləmələri — yalnız həmin sifarişin tərəfləri üçün zəruri olduğu müddətdə',
        ],
      },
      {
        title: '4.6. Rəy, şikayət və qiymətləndirmə',
        paragraphs: ['Tamamlanmış sifarişlər və Platforma daxilindəki müraciətlər üzrə:'],
        list: [
          'Reytinq (ulduz sayı), rəy mətni və tarixi',
          'Şikayət və ya bildiriş mətni, əlaqəli sifariş və tərəflər',
        ],
      },
      {
        title: '4.7. Texniki və avtomatik toplanan məlumatlar',
        paragraphs: ['Platformadan istifadə zamanı avtomatik olaraq:'],
        list: [
          'İnternet protokolu ünvanı',
          'Brauzer, cihaz və əməliyyat sistemi haqqında məlumat',
          'Giriş tarixi və vaxtı',
          'Səhifə baxışları və Platforma daxilindəki fəaliyyət (statistik təhlil üçün, mümkün qədər ümumiləşdirilmiş şəkildə)',
          'Kukilər, brauzerin yerli yaddaşı və oxşar texnologiyalar vasitəsilə toplanan məlumatlar',
        ],
      },
      {
        title: '4.8. Əlaqə və dəstək məlumatları',
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
      'Hesabınızın yaradılması, idarə edilməsi və girişin təmin edilməsi',
      'Xidmət axtarışı, sifariş verilməsi, təcili çağırışın yönləndirilməsi və sifarişlərin idarə edilməsi',
      'Xidmət verənlərlə xidmət alanlar arasında əlaqənin qurulması (o cümlədən mesajlaşma)',
      'Yaxınlıqdakı icraçının tapılması və (razılıq olduqda) yolda olma məlumatının göstərilməsi',
      'Kimlik yoxlaması və Platformanın etibarlılığının qorunması',
      'Reytinq, rəy və şikayət sisteminin işlədilməsi',
      'Platforma təhlükəsizliyinin təmin edilməsi və fırıldaqçılığın qarşısının alınması',
      'Texniki dəstək göstərilməsi və istifadəçi sorğularına cavab verilməsi',
      'Platformanın təkmilləşdirilməsi və xidmət keyfiyyətinin yüksəldilməsi',
      'Hüquqi öhdəliklərimizin yerinə yetirilməsi',
      'Sizin ayrıca razılığınız olduqda — məlumatlandırma və marketinq mesajlarının göndərilməsi',
    ],
    subsections: [
      {
        title: 'Hüquqi əsaslar',
        paragraphs: [
          'Emal Azərbaycan Respublikasının «Şəxsi məlumatlar haqqında» Qanununa uyğun olaraq aşağıdakı əsaslarla həyata keçirilir:',
        ],
        list: [
          'Məlumat subyektinin razılığı (o cümlədən qeydiyyat, bildirişlər, yer məlumatı və marketinq üçün)',
          'Sizinlə bağlanan müqavilənin (bu Siyasət və İstifadə qaydaları ilə qəbul olunan ictimai oferta) icrası üçün zəruri olması',
          'Qanunvericiliklə nəzərdə tutulmuş öhdəliklərin yerinə yetirilməsi',
          'Həyat, sağlamlıq, əmlak və ya təhlükəsizliyin qorunması üçün zəruri hallar',
        ],
      },
    ],
  },
  {
    id: 'istifade',
    title: '6. Məlumatların istifadəsi',
    paragraphs: [
      'Toplanan şəxsi məlumatlar yalnız yuxarıda göstərilən məqsədlər çərçivəsində və qanunvericiliyin tələblərinə uyğun olaraq istifadə olunur.',
      'Şəxsi məlumatlarınızı qanunsuz reklam, istənməyən kütləvi göndəriş və ya icazə verilməyən kommersiya məqsədləri üçün istifadə etmirik.',
      'Sifarişin icrası üçün zəruri olan əlaqə və ünvan məlumatları yalnız həmin sifarişin tərəfləri arasında paylaşılır. Kimlik sənədi şəkilləri inzibati yoxlama üçün istifadə olunur və üçüncü şəxslərə reklam məqsədilə verilmir.',
    ],
  },
  {
    id: 'paylasma',
    title: '7. Məlumatların üçüncü tərəflərlə paylaşılması',
    paragraphs: [
      'Şəxsi məlumatlarınızı satmırıq və icazəsiz olaraq üçüncü tərəflərə ötürmirik. Aşağıdakı hallarda məhdud şəkildə paylaşım mümkündür:',
      'Texniki tərəfdaşlar məlumatları yalnız bizim tapşırığımız əsasında, məxfilik öhdəliyi və müvafiq təhlükəsizlik tədbirləri ilə emal edir.',
    ],
    list: [
      'Xidmətin icrası üçün: sifariş zamanı xidmət verən və xidmət alan bir-birinin zəruri əlaqə, ünvan və (lazım olduqda) mövqe məlumatlarına çıxış əldə edir',
      'Texniki tərəfdaşlar: server yerləşdirmə, e-poçt göndərilməsi, xəritə və yer xidmətləri, statistika və təhlükəsizlik xidmətləri',
      'Hüquqi tələblər: məhkəmə qərarı, dövlət orqanlarının qanuni tələbi və ya qanunvericiliyin tələbi olduqda',
      'Hüquqi varislik: birləşmə, alınma və ya aktivlərin ötürülməsi halında — mümkün olduqda məlumat subyektlərinə əvvəlcədən məlumat verilməklə',
    ],
  },
  {
    id: 'saxlanma',
    title: '8. Məlumatların saxlanması müddəti',
    paragraphs: [
      'Şəxsi məlumatlar yalnız toplanma məqsədinin tələb etdiyi müddət ərzində və ya qanunvericiliklə müəyyən edilmiş müddət boyunca saxlanılır.',
      'Hesabınız aktiv olduğu müddətcə əsas profil məlumatlarınız saxlanılır. Hesabın silinməsini tələb etdikdə, qanuni saxlama öhdəlikləri (məsələn, mübahisə, fırıldaqçılıq araşdırması, vergi və uçot) istisna olmaqla, məlumatlar silinir, məhv edilir və ya şəxsiyyəti müəyyən etməyə imkan verməyəcək şəkildə dəyişdirilir.',
      'Sifariş, mesaj və yer qeydləri xidmətin icrası, mübahisələrin həlli və təhlükəsizlik üçün zəruri müddət saxlanıla bilər; təcili sifarişin mövqe yeniləmələri sifariş bitdikdən sonra qısa müddətdə silinə və ya ümumiləşdirilə bilər.',
      'Kimlik sənədi şəkilləri yoxlama başa çatdıqdan və qanuni saxlama müddəti keçdikdən sonra silinir.',
      'Texniki jurnallar təhlükəsizlik məqsədləri üçün məhdud müddət saxlanılır.',
    ],
  },
  {
    id: 'huquqlar',
    title: '9. Məlumat subyektinin hüquqları',
    paragraphs: [
      'Azərbaycan Respublikasının «Şəxsi məlumatlar haqqında» Qanununa uyğun olaraq aşağıdakı hüquqlara maliksiniz:',
      'Hüquqlarınızı həyata keçirmək üçün info@xidmetal.com ünvanına yazın və ya əlaqə formasından istifadə edin. Şəxsiyyətinizi təsdiq etmək üçün əlavə məlumat tələb oluna bilər. Sorğunuza, qanunvericilikdə başqa müddət nəzərdə tutulmayıbsa, 30 (otuz) təqvim günü ərzində cavab verəcəyik.',
      'Hesab parametrlərindən ad, əlaqə və bəzi profil məlumatlarını birbaşa yeniləyə bilərsiniz. Silinmə tələbi qanuni saxlama hallarında tam yerinə yetirilməyə bilər; bu barədə sizə izah veriləcək.',
    ],
    list: [
      'Şəxsi məlumatlarınızın emal edilib-edilmədiyi barədə məlumat almaq',
      'Şəxsi məlumatlarınıza çıxış əldə etmək',
      'Dəqiq olmayan və ya natamam məlumatların düzəldilməsini tələb etmək',
      'Qanunsuz və ya məqsədi bitmiş emal zamanı məlumatların silinməsini və ya məhv edilməsini tələb etmək',
      'Emala verdiyiniz razılığı gələcək üçün geri götürmək (bu, razılıq əsasında artıq yerinə yetirilmiş əməliyyatlara təsir etməyə bilər)',
      'Məlumatların emalının məhdudlaşdırılmasını tələb etmək',
      'Məlumatlarınızın qanunsuz emal edildiyini hesab etdiyiniz halda operatora və səlahiyyətli dövlət orqanına şikayət etmək',
    ],
  },
  {
    id: 'kukiler',
    title: '10. Kukilər və oxşar texnologiyalar',
    paragraphs: [
      'Giriş sessiyasını saxlamaq, təhlükəsizliyi artırmaq, dil və görünüş seçimlərini yadda saxlamaq və (məhdud həcmdə) istifadə statistikası toplamaq üçün kukilərdən və brauzerin yerli yaddaşından istifadə edirik.',
      'Brauzer parametrlərindən kukiləri idarə edə və ya silə bilərsiniz. Zəruri sessiyanı söndürmək hesabınıza girişin və bəzi funksiyaların işləməməsinə səbəb ola bilər.',
      'Brauzerinizdə «izləmə» qadağası aktivdirsə və ya statistika toplanmasından imtina etmisinizsə, qeyri-zəruri statistika toplanmaya bilər.',
    ],
    subsections: [
      {
        title: 'İstifadə etdiyimiz növlər',
        paragraphs: [],
        list: [
          'Zəruri — hesab girişi, təhlükəsizlik və Platformanın əsas funksiyaları üçün',
          'Funksional — görünüş və oxşar seçimlərinizin yadda saxlanması üçün',
          'Statistik — Platformadan istifadənin ümumiləşdirilmiş təhlili üçün (şəxsiyyəti birbaşa göstərmədən)',
        ],
      },
    ],
  },
  {
    id: 'tehlukesizlik',
    title: '11. Təhlükəsizlik tədbirləri',
    paragraphs: [
      'Şəxsi məlumatlarınızın qorunması üçün texniki və təşkilati tədbirlər görürük. Heç bir ötürmə və ya saxlama üsulu tam təhlükəsiz deyil.',
      'Məlumatların qanunsuz açıqlanması, itirilməsi və ya dəyişdirilməsi barədə məlumatımız olduqda, qanunvericiliyin tələb etdiyi qaydada sizi və (lazım olduqda) səlahiyyətli orqanları məlumatlandıracağıq.',
    ],
    list: [
      'Parolların bərpa olunmayan şifrələnmiş formada saxlanması',
      'Məlumat ötürülməsinin şifrələnmiş internet əlaqəsi ilə həyata keçirilməsi',
      'Giriş icazələrinin məhdudlaşdırılması və rol üzrə hüquqların ayrılması',
      'Sessiyaların vaxtaşırı yenilənməsi və çıxış zamanı ləğvi',
      'Müntəzəm təhlükəsizlik yeniləmələri və nəzarət',
      'İşçilərin və tapşırıqla işləyən şəxslərin məxfilik öhdəlikləri',
    ],
  },
  {
    id: 'usaq',
    title: '12. Uşaqların məxfiliyi',
    paragraphs: [
      'Platforma 18 yaşı tamam olmamış şəxslər üçün nəzərdə tutulmayıb. Bilərəkdən 18 yaşından kiçik şəxslərdən şəxsi məlumat toplamırıq.',
      'Belə məlumatın toplandığını aşkar etdikdə, qanuni tələblərə uyğun olaraq dərhal silinməsi üçün tədbir görəcəyik. Valideyn və ya qanuni nümayəndə bu barədə info@xidmetal.com ünvanına yazmalıdır.',
    ],
  },
  {
    id: 'beynelxalq',
    title: '13. Beynəlxalq məlumat ötürülməsi',
    paragraphs: [
      'Məlumatlarınız əsasən Azərbaycan Respublikasının ərazisində saxlanılmağa çalışılır. Texniki xidmətlərin (məsələn, server yerləşdirmə, e-poçt və ya xəritə) xaricdə yerləşməsi səbəbindən məlumatlar başqa ölkəyə ötürülə bilər.',
      'Belə ötürmə yalnız Siyasətdə göstərilən məqsədlər üçün və məxfilik öhdəliyi olan müqavilələr, habelə qanunvericiliyin tələb etdiyi digər təminatlar əsasında həyata keçirilir.',
    ],
  },
  {
    id: 'deyisiklikler',
    title: '14. Siyasətin dəyişdirilməsi',
    paragraphs: [
      'Bu Siyasəti vaxtaşırı yeniləyə bilərik. Dəyişikliklər Platformada dərc edildiyi andan qüvvəyə minir, əgər daha gec tarix göstərilməyibsə.',
      'Hüquqlarınıza və ya emalın həcminə təsir edən mühüm dəyişikliklər barədə e-poçt və ya Platforma daxilində bildiriş göndərməyə çalışacağıq. Qanun yeni razılıq tələb etdikdə, müvafiq emal yalnız razılıqdan sonra davam etdiriləcək.',
      'Dəyişikliklərlə razı deyilsinizsə, hesabınızı bağlayıb Platformadan istifadəni dayandırmalısınız.',
    ],
  },
  {
    id: 'elaqe',
    title: '15. Əlaqə',
    paragraphs: [
      'Məxfilik siyasəti və şəxsi məlumatlarınızın emalı ilə bağlı sual, şikayət və ya müraciətlərinizi aşağıdakı vasitələrlə göndərə bilərsiniz:',
      'Müraciətlərinizə qanunvericiliklə müəyyən edilmiş müddətlərdə cavab veriləcəkdir.',
    ],
    list: [
      'E-poçt: info@xidmetal.com',
      'Ünvan: Bakı, Azərbaycan',
    ],
  },
];

export default function PrivacyPage() {
  const siteUrl = getSiteUrl();
  return (
    <>
      <JsonLd
        data={[
          buildBreadcrumbJsonLd(siteUrl, [
            { name: 'Ana səhifə', path: '/' },
            { name: 'Məxfilik siyasəti', path: '/privacy' },
          ]),
          buildWebPageJsonLd(siteUrl, {
            name: 'Məxfilik siyasəti',
            description:
              'Xidmətal platformasında şəxsi məlumatlarınızın toplanması, istifadəsi, saxlanması və qorunması qaydaları.',
            path: '/privacy',
            dateModified: '2026-08-31',
          }),
        ]}
      />
      <PageBreadcrumbs
        items={[
          { href: '/', label: 'Ana səhifə' },
          { label: 'Məxfilik siyasəti' },
        ]}
      />
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
              Son yenilənmə: <time dateTime="2026-08-31">{LAST_UPDATED}</time>
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12">
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
                        href="mailto:info@xidmetal.com"
                        className="font-medium underline underline-offset-2 hover:text-brand-foreground"
                      >
                        info@xidmetal.com
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
