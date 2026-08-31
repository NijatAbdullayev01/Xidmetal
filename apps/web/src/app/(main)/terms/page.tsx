import type { Metadata } from 'next';
import Link from 'next/link';
import { Scale, Mail, FileText } from 'lucide-react';
import { APP } from '@xidmetal/shared';
import { PageBreadcrumbs } from '@/components/layout/breadcrumbs';
import { JsonLd } from '@/components/seo/json-ld';
import { pageMetadata } from '@/lib/seo';
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from '@/lib/seo-schema';
import { getSiteUrl } from '@/lib/site-url';

export const metadata: Metadata = pageMetadata({
  title: 'İstifadə qaydaları',
  description:
    'Xidmətal platformasının istifadə şərtləri, tərəflərin hüquq və öhdəlikləri, sifariş və məsuliyyət qaydaları.',
  canonical: '/terms',
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
    title: '1. Ümumi müddəalar',
    paragraphs: [
      `Bu İstifadə qaydaları («Qaydalar») ${APP.name} platformasının («Platforma», «biz», «bizim») istifadəsi ilə bağlı hüquqi şərtləri, tərəflərin hüquq və öhdəliklərini müəyyən edir.`,
      'Platformaya daxil olmaq, qeydiyyatdan keçmək və ya Platformanın istənilən funksiyasından istifadə etməklə bu Qaydaları tam oxuduğunuzu, başa düşdüyünüzü və qəbul etdiyinizi təsdiq edirsiniz. Qaydalarla razı deyilsinizsə, Platformadan istifadəni dərhal dayandırmalısınız.',
      'Bu Qaydalar Azərbaycan Respublikasının Mülki Məcəlləsi, «Elektron ticarət haqqında» Qanunu, «İstehlakçıların hüquqlarının müdafiəsi haqqında» Qanunu, «Şəxsi məlumatlar haqqında» Qanunu və digər tətbiq olunan normativ hüquqi aktlar çərçivəsində hazırlanmışdır.',
      'Qaydalar ictimai oferta xarakteri daşıyır. Hesab yaratmaq və ya Platformadan istifadə etmək ofertonun qəbulu hesab olunur və tərəflər arasında müqavilə münasibətləri yaranır.',
    ],
  },
  {
    id: 'terifler',
    title: '2. Təriflər',
    paragraphs: ['Bu Qaydalarda aşağıdakı terminlər aşağıdakı mənalarda istifadə olunur:'],
    list: [
      'Platforma — xidmət verənlərlə xidmət alanları bir araya gətirən Xidmətal veb-saytı və digər rəqəmsal interfeyslər.',
      'İstifadəçi — Platformada qeydiyyatdan keçmiş və ya keçməmiş hər hansı fiziki şəxs; xidmət verən hüquqi şəxs adından çıxış etdikdə həmin hüquqi şəxs də bu Qaydalardakı öhdəliklərə tabedir.',
      'Xidmət alan — Platforma vasitəsilə xidmət axtaran və ya sifariş verən istifadəçi.',
      'Xidmət verən — Platformada xidmət elanı yerləşdirən və xidmət göstərən istifadəçi (fiziki şəxs və ya hüquqi şəxs adından).',
      'Xidmət — xidmət verənin Platformada təklif etdiyi iş, peşə və ya digər ödənişli fəaliyyət.',
      'Sifariş — xidmət alanın konkret xidmət üzrə verdiyi və Platformada qeydə alınan müraciət (planlaşdırılmış və ya təcili).',
      'Hesab — istifadəçinin Platformada fərdi profili və ona bağlı məlumatlar.',
      'Məzmun — istifadəçilərin və ya Platformanın yerləşdirdiyi mətn, şəkil, rəy, qiymət və digər materiallar.',
    ],
  },
  {
    id: 'platforma-mahiyyeti',
    title: '3. Platformanın mahiyyəti',
    paragraphs: [
      'Xidmətal xidmət verənlərlə xidmət alanları bir araya gətirən informasiya platformasıdır. Biz, bir qayda olaraq, xidmətin birbaşa icraçısı, işəgötürən və ya tərəflərin nümayəndəsi deyilik.',
      'Xidmət verən və xidmət alan arasında bağlanan xidmət münasibətləri həmin tərəflər arasında yaranır. Platforma bu münasibətlərdə vasitəçi rolunda çıxış edir, əgər ayrıca yazılı razılaşma və ya qanunvericiliklə başqa qayda nəzərdə tutulmayıbsa.',
      'Biz xidmət verənlərin peşəkarlığını, lisenziya və icazələrini, xidmətin keyfiyyətini və ya nəticəsini avtomatik təmin etmirik. Elanın yoxlanması və ya «təsdiqlənmiş» nişanı yalnız Platforma qaydalarına uyğun ilkin yoxlamanı bildirir, xidmətin nəticəsinə zəmanət deyil. İstifadəçilər sifariş verməzdən əvvəl təklifi, reytinqi və digər məlumatları özləri qiymətləndirməlidirlər.',
    ],
    list: [
      'Platforma xidmət kataloqu, axtarış, sifariş idarəetməsi, mesajlaşma, bildiriş və reytinq funksiyalarını təqdim edir',
      'Xidmətin faktiki icrası, vaxtı, qiyməti və şərtləri xidmət verən ilə xidmət alan arasında razılaşdırılır',
      'Platforma tərəflər arasındakı mübahisələrdə məhkəmə və ya məcburi həll orqanı deyil; ədalətli həll üçün dəstək göstərə və şikayətə baxa bilər',
    ],
  },
  {
    id: 'qeydiyyat',
    title: '4. Hesabın yaradılması və təhlükəsizlik',
    paragraphs: [
      'Platformanın əsas funksiyalarından istifadə üçün qeydiyyat tələb oluna bilər. Qeydiyyat zamanı doğru, dəqiq və aktual məlumat təqdim etməlisiniz.',
      'Hesab yalnız 18 yaşı tamam olmuş fiziki şəxslər üçün nəzərdə tutulub. Qeydiyyatdan keçməklə bu yaş tələbinə cavab verdiyinizi təsdiq edirsiniz. Hüquqi şəxs adından qeydiyyat aparan şəxs müvafiq səlahiyyətə malik olduğunu təsdiq edir.',
      'Hesab məlumatlarınızın və parolunuzun məxfiliyinə siz cavabdehsiniz. Hesabınızda baş verən hərəkətlər, icazəniz olmadan üçüncü şəxslərin müdaxiləsi sübut edilməyibsə, sizin hesabınıza aid edilə bilər.',
      'Bir şəxs eyni vaxtda həm xidmət alan, həm də xidmət verən ola bilməz; hər rol üçün ayrı hesab tələb olunur.',
    ],
    list: [
      'Saxta, başqasının adından və ya çoxsaylı hesablar qadağandır',
      'Hesabınıza icazəsiz giriş aşkar etdikdə dərhal parolu dəyişin və bizimlə əlaqə saxlayın',
      'Biz yanlış məlumat, təhlükəsizlik riski və ya Qaydaların pozulması halında hesabı yoxlaya, məhdudlaşdıra və ya bağlaya bilərik',
    ],
  },
  {
    id: 'umumi-oveklik',
    title: '5. Ümumi istifadəçi öhdəlikləri',
    paragraphs: [
      'Platformadan istifadə edərkən qanunvericiliyə, bu Qaydalara və Məxfilik siyasətinə riayət etməlisiniz.',
    ],
    list: [
      'Dəqiq və aktual məlumat təqdim etmək',
      'Digər istifadəçilərə hörmətlə yanaşmaq, təhqir, təhdid və ayrı-seçkilikdən çəkinmək',
      'Platformanın işinə zərər verən texniki müdaxilələrdən (icazəsiz daxilolma, avtomatik məlumat yığımı, proqram kodunun tərsinə açılması və s.) çəkinmək',
      'Zərərli proqram və ya avtomatik vasitələrlə Platformaya zərər verməmək',
      'Üçüncü şəxslərin əqli mülkiyyət və şəxsi məlumat hüquqlarını pozmamaq',
      'Platformanı qanunsuz fəaliyyət, fırıldaqçılıq və ya aldatma üçün istifadə etməmək',
      'Sifariş və mesajlarda yalnız doğru və qanuni məlumat yerləşdirmək',
    ],
  },
  {
    id: 'xidmet-alan',
    title: '6. Xidmət alanın hüquq və öhdəlikləri',
    paragraphs: [
      'Xidmət alan Platformada xidmət axtara, müqayisə edə və sifariş verə bilər. Sifariş verməzdən əvvəl xidmətin təsviri, qiyməti, müddəti və şərtləri ilə tanış olmaq sizin məsuliyyətinizdir.',
    ],
    list: [
      'Sifariş zamanı doğru ünvan, əlaqə və xidmətə dair zəruri məlumat vermək',
      'Razılaşdırılmış vaxtda xidmətin göstərilməsi üçün şərait yaratmaq (giriş, təhlükəsizlik və s.)',
      'Sifariş statusuna uyğun ləğv qaydalarına riayət etmək',
      'Tərəflər arasında razılaşdırılmış xidmət haqqını vaxtında ödəmək (ödəniş hazırda Platforma daxilində aparılmır)',
      'Tamamlanmış xidmət barədə obyektiv və doğru rəy yazmaq',
      'Xidmət verənlə bağlı mübahisə yaranarsa, əvvəlcə tərəflər arasında, sonra Platforma dəstəyi vasitəsilə həllə cəhd etmək',
    ],
  },
  {
    id: 'xidmet-veren',
    title: '7. Xidmət verənin hüquq və öhdəlikləri',
    paragraphs: [
      'Xidmət verən Platformada xidmət elanı yerləşdirməklə təklifinin qanuni, dəqiq və icra edilə bilən olduğunu təsdiq edir.',
      'Xidmət verən fəaliyyəti üçün tələb olunan lisenziya, icazə, vergi, sosial ödəniş və digər hüquqi öhdəliklərə özü cavabdehdir. Platforma bu öhdəlikləri sizin adınızdan yerinə yetirmir.',
      'Təcili sifariş və ya «xidmətə açıq» statusu üçün cihazın yer məlumatına icazə verməklə bu məlumatın Məxfilik siyasətinə uyğun emalına razılıq verirsiniz.',
    ],
    list: [
      'Xidmət təsvirində doğru qiymət, müddət, əhatə və şərtlər göstərmək',
      'Qəbul etdiyi sifarişləri peşəkarlıqla və razılaşdırılmış vaxtda yerinə yetirmək',
      'Xidmət alanın məlumatlarını yalnız sifarişin icrası üçün istifadə etmək və məxfi saxlamaq',
      'Qanunsuz, təhlükəli və ya lisenziyasız xidmətləri elan etməmək',
      'Süni reytinq, saxta rəy və ya aldadıcı reklam üsullarından istifadə etməmək',
      'Sifarişi ləğv etdikdə və ya dəyişdirdikdə xidmət alanı və Platformanı vaxtında məlumatlandırmaq',
      'Tələb olunduqda kimlik təsdiqi sənədlərini doğru təqdim etmək',
      'Şirkət hesabında komanda təyinatı doğru olsun; icraçı işçilərinizin hərəkətlərinə görə siz məsuliyyət daşıyırsınız',
    ],
  },
  {
    id: 'sifarisler',
    title: '8. Sifarişlər, ləğv və dəyişiklik',
    paragraphs: [
      'Sifariş Platformada yaradıldıqda müvafiq statuslarla (məsələn, gözləmədə, təsdiqlənib, yolda, tamamlanıb, ləğv edilib) izlənilir. Statusların dəqiq siyahısı Platformanın cari funksiyalarına uyğun dəyişə bilər.',
      'Sifarişin ləğvi və dəyişdirilməsi sifarişin statusundan, tərəflərin razılığından və Platformada göstərilən qaydalardan asılıdır. Əsassız və təkrarlanan ləğvlər hesab məhdudiyyətinə səbəb ola bilər.',
    ],
    subsections: [
      {
        title: '8.1. Tərəflərin razılaşması',
        paragraphs: [
          'Xidmətin yekun şərtləri (vaxt, ünvan, əlavə işlər, qiymət dəyişikliyi) xidmət verən ilə xidmət alan arasında razılaşdırılır. Platformada göstərilən qiymət ilkin təklif xarakteri daşıya bilər, əgər elanda başqa qeyd yoxdursa.',
        ],
      },
      {
        title: '8.2. Ləğv',
        paragraphs: [
          'Ləğv imkanları kabinetinizdə və ya sifariş təfərrüatlarında göstərilir. Artıq başlanmış və ya tamamlanmış xidmət üzrə ləğv məhdudlaşdırıla bilər. Gələcəkdə Platforma daxilində ödəniş aktiv olsa, geri qaytarma qaydaları ayrıca dərc olunacaq.',
        ],
      },
      {
        title: '8.3. Təcili sifariş',
        paragraphs: [
          '«İndi çağır» və oxşar təcili sifariş yaxınlıqdakı xidmətə açıq icraçılara təklif göndərir. Qəbul edilməzsə, axtarış pəncərəsi bitdikdə sifariş avtomatik ləğv oluna bilər. Xidmət alan qiyməti qəbul etmədikdə başqa icraçı axtara bilər; bu, əvvəlki icraçı üçün öhdəlik yaratmır.',
          'Təcili sifarişdə ünvan və (verildikdə) mövqe məlumatı yalnız axtarış və icra üçün istifadə olunur.',
        ],
      },
      {
        title: '8.4. Mesajlaşma',
        paragraphs: [
          'Sifarişə bağlı yazışmalar xidmətin razılaşdırılması üçündür. Təhqir, təhdid, qanunsuz təklif və Platformadan kənar fırıldaqçılıq qadağandır. Mübahisə və təhlükəsizlik üçün yazışmalar saxlanıla bilər.',
        ],
      },
    ],
  },
  {
    id: 'odenisler',
    title: '9. Qiymətlər, ödəniş və komissiya',
    paragraphs: [
      'Xidmət qiymətləri xidmət verənlər tərəfindən müəyyən edilir və Platformada Azərbaycan manatı ilə və ya elanda qeyd olunan qaydada göstərilir.',
      'Hal-hazırda Platforma xidmət verənlərdən və xidmət alanlardan komissiya, abunə və ya platforma haqqı tutmur. Xidmət haqqı tərəflər arasında birbaşa (nağd və ya öz razılaşmalarına uyğun digər üsulla) ödənilir; Platforma daxilində kartla ödəniş, məbləğin tutulması və ya saxlanması yoxdur.',
      'Gələcəkdə daxili ödəniş və ya komissiya tətbiq edilərsə, müvafiq şərtlər Platformada əlavə olaraq dərc olunacaq və bu Qaydaların tərkib hissəsi hesab ediləcək. Belə dəyişiklik mühüm şərt sayılır və barədə məlumat veriləcək.',
    ],
    list: [
      'Hal-hazırda xidmət verənlərdən Platforma haqqı və ya komissiya alınmır',
      'Xidmət haqqı xidmət alan ilə xidmət verən arasında razılaşmaya əsasən ödənilir',
      'Vergi, sosial ödəniş və digər dövlət öhdəlikləri hər tərəfin öz qanuni məsuliyyətidir',
    ],
  },
  {
    id: 'reyting',
    title: '10. Reytinq və rəylər',
    paragraphs: [
      'Reytinq və rəy sistemi digər istifadəçilərə obyektiv seçim etməyə kömək etmək üçündür. Rəylər yalnız real, tamamlanmış sifariş təcrübəsinə əsaslanmalıdır.',
    ],
    list: [
      'Saxta, alınmış və ya qarşılıqlı razılaşma ilə süni reytinq yaratmaq qadağandır',
      'Təhqiredici, böhtanlı və ya qanunsuz məzmunlu rəylər silinə bilər',
      'Platforma reytinq manipulyasiyası aşkar etdikdə rəyi gizlədə və hesabı məhdudlaşdıra bilər',
      'Reytinq orta göstərici və Platformanın dərc etdiyi qaydalara əsasən hesablana bilər',
    ],
  },
  {
    id: 'qadagan',
    title: '11. Qadağan edilmiş fəaliyyətlər',
    paragraphs: ['Aşağıdakı hərəkətlər qəti qadağandır:'],
    list: [
      'Qanunsuz, lisenziyasız və ya təhlükəli xidmətlərin təklif edilməsi',
      'Fırıldaqçılıq, saxta sənəd, şəxsiyyət oğurluğu',
      'İstənməyən reklam və digər istifadəçilərin narahat edilməsi',
      'Platformanı rəqib məhsula yönləndirmək üçün sistematik sui-istifadə',
      'Digər istifadəçilərin əlaqə məlumatlarını icazəsiz toplamaq və ya satmaq',
      'Uşaq əməyi, ayrı-seçkilik və ya zorakılıq təşviq edən məzmun',
      'Platformanın təhlükəsizlik sistemlərini pozmağa cəhd',
    ],
  },
  {
    id: 'eqli-mulkiyyet',
    title: '12. Əqli mülkiyyət',
    paragraphs: [
      'Platformanın dizaynı, loqosu, proqram təminatı, mətnləri, qrafikası və digər brend elementləri Xidmətala və ya müvafiq hüquq sahiblərinə məxsusdur. Bu materialların icazəsiz surəti, dəyişdirilməsi və kommersiya istifadəsi qadağandır.',
      'İstifadəçi Platformaya məzmun (elan, şəkil, rəy və s.) yerləşdirməklə həmin məzmuna dair lazımi hüquqlara malik olduğunu təsdiq edir və Platformaya məzmunu Platformanın fəaliyyəti çərçivəsində göstərmək, saxlamaq və texniki cəhətdən emal etmək üçün müstəsna olmayan, ödənişsiz icazə verir. Bu icazə məzmun silinənə və ya hesab bağlanana qədər, habelə qanuni saxlama müddəti ərzində qüvvədə qalır.',
      'Hüquq pozuntusu barədə müraciət üçün info@xidmetal.com ünvanına yazın.',
    ],
  },
  {
    id: 'mesuliyyet',
    title: '13. Məsuliyyətin məhdudlaşdırılması',
    paragraphs: [
      'Qanunvericiliyin yol verdiyi həddə və istehlakçıların məcburi hüquqları saxlanılmaqla Platforma aşağıdakılara görə məsuliyyət daşımır:',
    ],
    list: [
      'Xidmət verən ilə xidmət alan arasında yaranan xidmətin keyfiyyəti, gecikmə, zərər və ya itki',
      'İstifadəçilərin verdiyi məlumatların düzgünlüyü və tamlığı',
      'Üçüncü tərəf xidmətləri, xarici keçidlər və xəritə göstərilməsi',
      'İnternet kəsintisi, texniki nasazlıq, texniki xidmət və qarşısıalınmaz qüvvə halları',
      'İstifadəçinin öz hesab məlumatlarını qoruya bilməməsi nəticəsində yaranan zərər',
    ],
    subsections: [
      {
        title: '13.1. Məsuliyyət həddi',
        paragraphs: [
          'Qanunvericiliklə istisna edilə bilməyən məsuliyyət (o cümlədən qəsd, ağır ehtiyatsızlıq və istehlakçının məcburi hüquqları) saxlanılır.',
          'Bundan başqa, Platformanın təqsiri ilə vurulmuş birbaşa zərərə görə məsuliyyət, son 12 (on iki) ay ərzində sizin Platformaya ödədiyiniz xidmət haqqı və ya komissiya məbləği ilə məhdudlaşır. Belə ödəniş olmadıqda Platforma yalnız özünün sübut edilmiş təqsiri nəticəsində vurulmuş birbaşa zərərə görə, qanunun yol verdiyi həddə cavabdehdir.',
          'Dolayı zərər, mənfəət itkisi və cərimə xarakterli tələblərə görə Platforma, qanun bunu qadağan etmədiyi halda, məsuliyyət daşımır.',
        ],
      },
    ],
  },
  {
    id: 'zemanet',
    title: '14. Zəmanətlərin rəddi',
    paragraphs: [
      'Platforma mövcud vəziyyətdə, «olduğu kimi» təqdim olunur. Qanunvericiliyin yol verdiyi həddə ticarətə yararlılıq, müəyyən məqsədə uyğunluq və hüquq pozuntusunun olmaması barədə əlavə zəmanətlər verilmir.',
      'Platformanın fasiləsiz, xətasız və ya təhlükəsiz işləyəcəyinə dair zəmanət vermirik. Funksiyalar vaxtaşırı dəyişdirilə, dayandırıla və ya yenilənə bilər.',
    ],
  },
  {
    id: 'zererin-odenilmesi',
    title: '15. Zərərin ödənilməsi',
    paragraphs: [
      'Bu Qaydaları, qanunvericiliyi və ya üçüncü şəxslərin hüquqlarını pozmağınız nəticəsində Platformaya, onun idarəçilərinə və əməkdaşlarına qarşı irəli sürülən əsaslı iddia, zərər, cərimə və məhkəmə xərclərini qanunun yol verdiyi həddə ödəməyi öhdəyə götürürsünüz. Bu müddəa istehlakçının qanunla qorunan hüquqlarını məhdudlaşdırmır.',
    ],
  },
  {
    id: 'hesab-baglama',
    title: '16. Hesabın dayandırılması və ləğvi',
    paragraphs: [
      'İstədiyiniz zaman hesabınızı bağlamaq üçün bizimlə əlaqə saxlaya və ya mövcud hesab parametrlərindən istifadə edə bilərsiniz. Aktiv sifarişlər və qanuni saxlama öhdəlikləri olduqda bağlanma prosesi tamamlanana qədər müəyyən məlumatlar saxlanıla bilər.',
      'Biz Qaydaların pozulması, fırıldaqçılıq şübhəsi, digər istifadəçilərin hüquqlarının pozulması və ya Platformanın təhlükəsizliyi üçün risk yaradan hallarda hesabı xəbərdarlıqla və ya təcili hallarda xəbərdarlıqsız məhdudlaşdıra, dayandıra və ya silə bilərik. Mümkün olduqda səbəb barədə qısa məlumat veriləcək.',
    ],
  },
  {
    id: 'mexfilik',
    title: '17. Məxfilik',
    paragraphs: [
      'Şəxsi məlumatlarınızın emalı ayrıca Məxfilik siyasəti ilə tənzimlənir. Platformadan istifadə etməklə Məxfilik siyasətinin şərtlərini də qəbul etmiş olursunuz.',
      'Ətraflı məlumat üçün bu saytdakı Məxfilik siyasəti səhifəsinə baxın.',
    ],
  },
  {
    id: 'deyisiklikler',
    title: '18. Qaydaların dəyişdirilməsi',
    paragraphs: [
      'Biz bu Qaydaları vaxtaşırı yeniləyə bilərik. Yenilənmiş versiya Platformada dərc edildiyi andan qüvvəyə minir, əgər daha gec tarix göstərilməyibsə.',
      'Mühüm dəyişikliklər (ödəniş, komissiya, məsuliyyət həddi və ya əsas hüquqlar) barədə e-poçt və ya Platforma daxilində bildiriş göndərməyə çalışacağıq. Dəyişikliklərlə razı deyilsinizsə, hesabınızı bağlayıb istifadəni dayandırmalısınız.',
      'Qanun istehlakçıya əlavə müdafiə verdikdə, həmin müdafiə bu Qaydalardan üstün tutulur.',
    ],
  },
  {
    id: 'muhakime',
    title: '19. Tətbiq olunan hüquq və mübahisələr',
    paragraphs: [
      'Bu Qaydalar Azərbaycan Respublikasının qanunvericiliyinə uyğun tənzimlənir və şərh edilir.',
      'Mübahisələr əvvəlcə danışıqlar yolu ilə həll edilməlidir. Razılıq əldə olunmadıqda mübahisələrə Azərbaycan Respublikasının səlahiyyətli məhkəmələri baxır. İstehlakçı qanunvericiliyə uyğun olaraq öz yaşayış yeri üzrə məhkəməyə müraciət etmək hüququnu saxlayır.',
      'İstehlakçı hüquqlarının müdafiəsi ilə bağlı qanunvericilikdə nəzərdə tutulmuş hüquqlar bu Qaydalarla məhdudlaşdırıla bilməz.',
    ],
  },
  {
    id: 'sair',
    title: '20. Digər müddəalar',
    paragraphs: [],
    list: [
      'Bu Qaydaların hər hansı müddəası etibarsız hesab edilsə, qalan müddəalar qüvvədə qalır.',
      'Hüququmuzdan istifadə etməməyimiz ondan imtina demək deyil.',
      'Bu Qaydalar tərəflər arasındakı razılaşmanın tam mətnini təşkil edir və əvvəlki şifahi və yazılı razılaşmaları əvəz edir (ayrıca yazılı müqavilə istisna olmaqla).',
      'Qaydaları üçüncü şəxslərə ötürmə hüququ olmadan qəbul edirsiniz; biz Platformanın idarəetmə hüququnu hüquqi varislərə ötürə bilərik.',
      'Qarşısıalınmaz qüvvə (təbii fəlakət, müharibə, dövlət qərarları, internet infrastrukturunun kütləvi sıradan çıxması və s.) hallarında öhdəliklərin yerinə yetirilməməsi məsuliyyət doğurmur.',
    ],
  },
  {
    id: 'elaqe',
    title: '21. Əlaqə',
    paragraphs: [
      'İstifadə qaydaları ilə bağlı sual, bildiriş və hüquqi müraciətlərinizi aşağıdakı vasitələrlə göndərə bilərsiniz:',
    ],
    list: [
      'E-poçt: info@xidmetal.com',
      'Ünvan: Bakı, Azərbaycan',
      'Əlaqə səhifəsi vasitəsilə yazılı müraciət',
    ],
  },
];

export default function TermsPage() {
  const siteUrl = getSiteUrl();
  return (
    <>
      <JsonLd
        data={[
          buildBreadcrumbJsonLd(siteUrl, [
            { name: 'Ana səhifə', path: '/' },
            { name: 'İstifadə qaydaları', path: '/terms' },
          ]),
          buildWebPageJsonLd(siteUrl, {
            name: 'İstifadə qaydaları',
            description:
              'Xidmətal platformasının istifadə şərtləri, tərəflərin hüquq və öhdəlikləri, sifariş və məsuliyyət qaydaları.',
            path: '/terms',
            dateModified: '2026-08-31',
          }),
        ]}
      />
      <PageBreadcrumbs
        items={[
          { href: '/', label: 'Ana səhifə' },
          { label: 'İstifadə qaydaları' },
        ]}
      />
      <section className="relative overflow-hidden bg-gradient-to-b from-brand/15 via-brand/5 to-background">
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/40 to-brand/15 ring-1 ring-brand/30">
              <Scale className="h-7 w-7 text-brand-foreground" strokeWidth={1.75} aria-hidden />
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              İstifadə <span className="text-brand">qaydaları</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              {APP.name} platformasından istifadənin şərtləri, tərəflərin hüquq və öhdəlikləri
              barədə hüquqi çərçivə.
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
                <ol className="mt-4 max-h-[min(70vh,32rem)] space-y-2 overflow-y-auto text-sm pr-1">
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
                  Bu sənəd {APP.name} platformasının istifadə şərtlərini müəyyən edir.
                  Qeydiyyat və ya Platformadan istifadə bu Qaydaların qəbulu hesab olunur.
                  Məxfiliklə bağlı ətraflı məlumat üçün{' '}
                  <Link
                    href="/privacy"
                    className="font-medium text-foreground underline underline-offset-2 hover:text-brand-dark"
                  >
                    Məxfilik siyasətinə
                  </Link>{' '}
                  baxın.
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
                      Hüquqi sualınız var?
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-brand-foreground/80">
                      İstifadə qaydaları ilə bağlı müraciətinizi{' '}
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
