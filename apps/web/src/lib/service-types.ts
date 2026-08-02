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
};

export function getServiceTypesForCategory(slug: string): readonly string[] | undefined {
  return CATEGORY_SERVICE_TYPES[slug];
}

export function hasPredefinedServiceTypes(slug: string): boolean {
  return slug in CATEGORY_SERVICE_TYPES;
}
