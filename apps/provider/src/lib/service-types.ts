import { TRANSPORT_SERVICE_TYPES, serviceTypeSlug } from '@xidmetal/shared';

/** Kateqoriya slug → xidmət növləri */
export const CATEGORY_SERVICE_TYPES: Record<string, readonly string[]> = {
  temizlik: [
    'Ev və ofis təmizliyi',
    'Xalça təmizliyi',
    'Yumuşaq əşya təmizliyi',
    'Geyimlərin təmizliyi',
    'Şüşə təmizliyi',
    'Maşın təmizliyi',
  ],
  temir: [
    'Ev və ofis təmiri',
    'Elektrik işləri',
    'Santexnik işləri',
    'Malyar (boya) işləri',
    'Divar kağızı işləri',
    'Kafel-metlax işləri',
    'Laminat və parket işləri',
    'Alçıpan və asma tavan işləri',
    'Kondisioner xidməti',
    'Kombi xidməti',
    'Məişət texnikasının təmiri',
    'Mebel işləri',
    'Qapı və pəncərə işləri',
    'Dam və fasad işləri',
    'Qaynaq işləri',
    'Ümumi avtomobil təmiri',
    'Mühərrik təmiri (avtomobil)',
    'Sürətlər qutusu təmiri (avtomobil)',
    'Kompüter diaqnostikası və avtoelektrik',
    'Tormoz sistemi (avtomobil)',
    'Asqı və sükan sistemi (avtomobil)',
    'Kondisioner təmiri (avtomobil)',
    'Razval-balans və təkər xidməti (avtomobil)',
    'Dəmirçi işləri (avtomobil)',
    'Rəngsazlıq (avtomobil)',
    'Yağ dəyişimi və texniki baxım (avtomobil)',
    'Avtomobil açar ustası',
  ],
  gozellik: [
    'Saç xidmətləri',
    'Dırnaq xidmətləri',
    'Makiyaj',
    'Qaş və kiprik',
    'Kosmetologiya',
    'Epilyasiya',
    'Masaj',
    'SPA xidmətləri',
    'Estetik prosedurlar',
    'Bədən baxımı',
  ],
  dezinfeksiya: [
    'Ev və ofis dezinfeksiyası',
    'Dezinseksiya (həşərat)',
    'Deratizasiya (gəmirici)',
    'Kompleks sanitariya',
    'Küf və nəmlik müalicəsi',
    'Qoxu aradan qaldırma',
    'Restoran və obyekt sanitariyası',
    'Avtomobil dezinfeksiyası',
    'Profilaktik müalicə',
  ],
  neqliyyat: [...TRANSPORT_SERVICE_TYPES],
  catdirilma: [
    'Sənəd çatdırılması (piyada)',
    'Bağlama çatdırılması (piyada)',
    'Sənəd çatdırılması (moto)',
    'Bağlama çatdırılması (moto)',
    'Sənəd çatdırılması (avtomobil)',
    'Bağlama çatdırılması (avtomobil)',
  ],
};

export function getServiceTypesForCategory(slug: string): readonly string[] | undefined {
  return CATEGORY_SERVICE_TYPES[slug];
}

export function hasPredefinedServiceTypes(slug: string): boolean {
  return slug in CATEGORY_SERVICE_TYPES;
}

/** Yalnız kataloq növü — unikal elan başlığından doorway səhifə yaranmasın. */
export function isCanonicalServiceType(categorySlug: string, title: string): boolean {
  const types = getServiceTypesForCategory(categorySlug);
  if (!types || types.length === 0) return false;
  const key = serviceTypeSlug(title);
  return types.some((type) => serviceTypeSlug(type) === key);
}
