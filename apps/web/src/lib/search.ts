import { CATEGORY_SERVICE_TYPES } from '@/lib/service-types';

/** Kateqoriya axtarış indeksi üçün minimal tip */
export interface SearchCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  serviceCount?: number;
}

export type SearchSuggestionKind = 'category' | 'serviceType' | 'service';

export interface SearchSuggestion {
  id: string;
  kind: SearchSuggestionKind;
  label: string;
  description: string;
  href: string;
  score: number;
  categorySlug?: string;
}

/** Azərbaycan hərflərini və diacritic-ləri müqayisə üçün normallaşdırır */
export function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase('az')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ə/g, 'e')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Xidmət növü → istifadəçinin tez yazdığı sinonimlər */
const SERVICE_TYPE_ALIASES: Record<string, readonly string[]> = {
  'Ev və ofis təmizliyi': ['ev temizligi', 'ofis temizligi', 'temizlikci', 'genel temizlik'],
  'Xalça təmizliyi': ['xalca', 'xalca yuma', 'carpet'],
  'Yumuşaq əşya təmizliyi': ['divan temizligi', 'mebel temizligi', 'yumsaq esya'],
  'Geyimlərin təmizliyi': ['kimia', 'paltar temizligi', 'dry clean'],
  'Şüşə təmizliyi': ['susse', 'pencere temizligi', 'vitraj'],
  'Maşın təmizliyi': ['avtoyuma', 'masin yuma', 'detailing'],
  'Ev və ofis təmiri': ['usta', 'temirci', 'ev temiri', 'ofis temiri'],
  'Elektrik işləri': ['elektrik', 'elektrikci', 'isiq', 'rozетка', 'kabelləmə'],
  'Santexnik işləri': ['santexnik', 'boru', 'su sistemleri', 'kanalizasiya'],
  'Malyar (boya) işləri': ['malyar', 'boya', 'rengleme', 'divar boyama'],
  'Divar kağızı işləri': ['divar kagizi', 'oboy', 'wallpaper'],
  'Kafel-metlax işləri': ['kafel', 'metlax', 'kafelci'],
  'Laminat və parket işləri': ['laminat', 'parket', 'dosa'],
  'Alçıpan və asma tavan işləri': ['alcipan', 'asma tavan', 'gipsokarton'],
  'Kondisioner xidməti': ['kondisioner', 'klima', 'kondisioner ustasi'],
  'Kombi xidməti': ['kombi', 'kombi ustasi', 'istilik sistemi'],
  'Məişət texnikasının təmiri': ['soyuducu', 'paltaryuyan', 'meiset texnikasi'],
  'Mebel işləri': ['mebel', 'mebel ustasi', 'mebel yigma'],
  'Qapı və pəncərə işləri': ['qapi', 'pencere', 'pvc'],
  'Dam və fasad işləri': ['dam', 'fasad', 'dam örtüyü'],
  'Qaynaq işləri': ['qaynaq', 'qaynaqci', 'metal isleri'],
  'Ümumi avtomobil təmiri': ['avtomobil temiri', 'masin ustasi', 'avto servis', 'masin temiri'],
  'Mühərrik təmiri (avtomobil)': ['muherrik', 'motor temiri', 'motorist'],
  'Sürətlər qutusu təmiri (avtomobil)': ['suretler qutusu', 'karobka', 'transmisya'],
  'Kompüter diaqnostikası və avtoelektrik': [
    'diaqnostika',
    'avtoelektrik',
    'komputer diaqnostika',
    'obd',
  ],
  'Tormoz sistemi (avtomobil)': ['tormoz', 'eyləc', 'abs'],
  'Asqı və sükan sistemi (avtomobil)': ['asqi', 'sukan', 'qranat', 'rulavoy', 'kardan'],
  'Kondisioner təmiri (avtomobil)': ['avto kondisioner', 'masin kondisioneri', 'klima qaz'],
  'Razval-balans və təkər xidməti (avtomobil)': [
    'razval',
    'balans',
    'teker',
    'sin',
    'razval balans',
  ],
  'Dəmirçi işləri (avtomobil)': ['demirci', 'kuzov', 'avto demirci'],
  'Rəngsazlıq (avtomobil)': ['rengsaz', 'avto malyar', 'masin boyama'],
  'Yağ dəyişimi və texniki baxım (avtomobil)': ['yag deyisimi', 'texniki baxim', 'to', 'oil change'],
  'Avtomobil açar ustası': ['acar ustasi', 'masin acari', 'avto cilinger', 'pult yazma'],
  'Saç xidmətləri': ['sac', 'sac kesimi', 'berber', 'sac boyama', 'salon'],
  'Dırnaq xidmətləri': ['dirnaq', 'manikur', 'pedikur', 'nail'],
  'Makiyaj': ['makiyaj', 'makeup', 'gelin makiyaji'],
  'Qaş və kiprik': ['qas', 'kiprik', 'lash', 'brow'],
  'Kosmetologiya': ['kosmetoloq', 'uz bakimi', 'kosmetologiya'],
  'Epilyasiya': ['epilyasiya', 'lazer', 'tuy tukenmesi'],
  'Masaj': ['masaj', 'massage'],
  'SPA xidmətləri': ['spa', 'hamam'],
  'Estetik prosedurlar': ['estetika', 'botoks', 'filler'],
  'Bədən baxımı': ['beden bakimi', 'body care'],
  'Ev və ofis dezinfeksiyası': [
    'dezinfeksiya',
    'dezinfeksiya xidmeti',
    'ev dezinfeksiyasi',
    'ofis dezinfeksiyasi',
  ],
  'Dezinseksiya (həşərat)': [
    'dezinseksiya',
    'tarakan',
    'qarisqa',
    'heserat',
    'pest control',
  ],
  'Deratizasiya (gəmirici)': ['deratizasiya', 'sican', 'sicovul', 'gemirici'],
  'Kompleks sanitariya': ['kompleks sanitariya', 'sanitariya', 'tam emal'],
  'Küf və nəmlik müalicəsi': ['kuf', 'nemlik', 'kuf temizleme', 'mold'],
  'Qoxu aradan qaldırma': ['qoxu', 'ozon', 'qoxu temizleme', 'iyi qoxu'],
  'Restoran və obyekt sanitariyası': [
    'restoran dezinfeksiyasi',
    'obyekt sanitariyasi',
    'kafe dezinfeksiyasi',
  ],
  'Avtomobil dezinfeksiyası': ['masin dezinfeksiyasi', 'avto dezinfeksiya'],
  'Profilaktik müalicə': ['profilaktika', 'dovri mualice', 'mueqavile'],
  'Kiçik yükdaşıma': ['kicik yuk', 'kicik yukdasima', 'van', 'minivan'],
  'Orta yükdaşıma': ['orta yuk', 'orta yukdasima', 'qazel', 'gazelle'],
  'Böyük yükdaşıma': ['boyuk yuk', 'boyuk yukdasima', 'yuk masini', 'fura', 'tir'],
  Evakuator: ['evakuator', 'evacutor', 'tow', 'cekici', 'çekici'],
};

const CATEGORY_ALIASES: Record<string, readonly string[]> = {
  temizlik: ['temizlik', 'temizlikci', 'yuma'],
  temir: ['temir', 'usta', 'ustalar', 'texniki'],
  gozellik: ['gozellik', 'salon', 'gozellik salonu', 'beauty'],
  dezinfeksiya: [
    'dezinfeksiya',
    'dezinseksiya',
    'deratizasiya',
    'sanitariya',
    'tarakan',
    'sican',
  ],
  tehsil: ['tehsil', 'ders', 'repetitor', 'muellim', 'kurs'],
  neqliyyat: ['neqliyyat', 'taksi', 'dasinma', 'yuk', 'catdirilma', 'evakuator'],
  catdirilma: [
    'catdirilma',
    'kuryer',
    'baglama',
    'sened',
    'piyada',
    'moto',
    'motokuryer',
    'avtomobil',
  ],

  'it-xidmetleri': ['it', 'komputer', 'proqramci', 'texniki destek', 'sayt'],
  'foto-video': ['foto', 'video', 'fotograf', 'cekiliş', 'montaj'],
  qidalanma: ['qidalanma', 'aspaz', 'yemek', 'catering', 'sofra'],
};

function tokensOf(normalized: string): string[] {
  return normalized.split(' ').filter((token) => token.length > 0);
}

/**
 * Sorğu ilə mətn arasındakı uyğunluq balı.
 * Exact / prefix / token örtüyü — dəqiq nəticə üçün sıralama.
 */
export function scoreMatch(query: string, ...fields: Array<string | undefined>): number {
  const q = normalizeSearchText(query);
  if (!q) return 0;

  let best = 0;
  const qTokens = tokensOf(q);

  for (const field of fields) {
    if (!field) continue;
    const n = normalizeSearchText(field);
    if (!n) continue;

    if (n === q) {
      best = Math.max(best, 100);
      continue;
    }
    if (n.startsWith(q)) {
      best = Math.max(best, 90);
      continue;
    }
    if (n.includes(q)) {
      best = Math.max(best, 75);
      continue;
    }

    const fieldTokens = tokensOf(n);
    if (qTokens.length === 0) continue;

    const matched = qTokens.filter((qt) =>
      fieldTokens.some((ft) => ft === qt || ft.startsWith(qt) || qt.startsWith(ft)),
    ).length;

    if (matched === qTokens.length) {
      best = Math.max(best, 70);
    } else if (matched > 0) {
      best = Math.max(best, 40 + (matched / qTokens.length) * 25);
    }
  }

  return best;
}

function buildTypeHref(categorySlug: string, type: string): string {
  const params = new URLSearchParams({ type });
  return `/categories/${categorySlug}?${params.toString()}`;
}

export function buildServiceSearchHref(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return '/services';
  return `/services?q=${encodeURIComponent(trimmed)}`;
}

/** Taxonomiya + kateqoriyalar üzrə ani təkliflər (API gözləmədən) */
export function getTaxonomySuggestions(
  query: string,
  categories: readonly SearchCategory[],
  limit = 8,
): SearchSuggestion[] {
  const trimmed = query.trim();
  if (trimmed.length < 1) return [];

  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
  const suggestions: SearchSuggestion[] = [];

  for (const category of categories) {
    const aliases = CATEGORY_ALIASES[category.slug] ?? [];
    const score = scoreMatch(
      trimmed,
      category.name,
      category.description,
      category.slug,
      ...aliases,
    );

    if (score >= 40) {
      suggestions.push({
        id: `category:${category.slug}`,
        kind: 'category',
        label: category.name,
        description:
          category.serviceCount !== undefined
            ? `${category.serviceCount} xidmət · Kateqoriya`
            : 'Kateqoriya',
        href: `/categories/${category.slug}`,
        score: score + 5,
        categorySlug: category.slug,
      });
    }
  }

  for (const [slug, types] of Object.entries(CATEGORY_SERVICE_TYPES)) {
    const category = categoryBySlug.get(slug);
    for (const type of types) {
      const aliases = SERVICE_TYPE_ALIASES[type] ?? [];
      const score = scoreMatch(trimmed, type, ...aliases);

      if (score >= 40) {
        suggestions.push({
          id: `type:${slug}:${type}`,
          kind: 'serviceType',
          label: type,
          description: category ? `${category.name} · Xidmət növü` : 'Xidmət növü',
          href: buildTypeHref(slug, type),
          score: score + (score >= 90 ? 10 : 0),
          categorySlug: slug,
        });
      }
    }
  }

  return suggestions.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, 'az')).slice(0, limit);
}

/** Canlı elanları təklif siyahısına çevir */
export function mapServicesToSuggestions(
  query: string,
  services: ReadonlyArray<{
    id: string;
    title: string;
    description: string;
    categoryName: string;
    categoryId: string;
    providerName: string;
    location?: string;
  }>,
  categorySlugById: ReadonlyMap<string, string>,
  limit = 5,
): SearchSuggestion[] {
  return services
    .map((service) => {
      const slug = categorySlugById.get(service.categoryId);
      const score = scoreMatch(
        query,
        service.title,
        service.description,
        service.categoryName,
        service.providerName,
        service.location,
      );

      const href = slug
        ? buildTypeHref(slug, service.title)
        : buildServiceSearchHref(service.title);

      return {
        id: `service:${service.id}`,
        kind: 'service' as const,
        label: service.title,
        description: `${service.providerName} · ${service.categoryName}`,
        href,
        score,
        categorySlug: slug,
      };
    })
    .filter((item) => item.score >= 35)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Taxonomiya + canlı nəticələri birləşdirib dedupe edir */
export function mergeSuggestions(
  taxonomy: readonly SearchSuggestion[],
  services: readonly SearchSuggestion[],
  limit = 10,
): SearchSuggestion[] {
  const seen = new Set<string>();
  const merged: SearchSuggestion[] = [];

  const ordered = [...taxonomy, ...services].sort(
    (a, b) => b.score - a.score || a.label.localeCompare(b.label, 'az'),
  );

  for (const item of ordered) {
    const key =
      item.kind === 'serviceType'
        ? `type:${item.categorySlug}:${normalizeSearchText(item.label)}`
        : item.kind === 'category'
          ? `cat:${item.categorySlug}`
          : item.id;

    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= limit) break;
  }

  return merged;
}
