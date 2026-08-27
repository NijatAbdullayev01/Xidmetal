/** Azərbaycanın şəhər və rayonları (xidmət ərazisi seçimi üçün) */

export interface AzerbaijanLocationGroup {
  label: string;
  locations: readonly string[];
}

export const AZERBAIJAN_LOCATION_GROUPS: readonly AzerbaijanLocationGroup[] = [
  {
    label: 'Respublika şəhərləri',
    locations: [
      'Bakı',
      'Gəncə',
      'Sumqayıt',
      'Mingəçevir',
      'Naftalan',
      'Şirvan',
      'Şəki',
      'Yevlax',
      'Lənkəran',
      'Xankəndi',
      'Naxçıvan',
    ],
  },
  {
    label: 'Bakı rayonları',
    locations: [
      'Bakı, Binəqədi rayonu',
      'Bakı, Xətai rayonu',
      'Bakı, Xəzər rayonu',
      'Bakı, Qaradağ rayonu',
      'Bakı, Nərimanov rayonu',
      'Bakı, Nəsimi rayonu',
      'Bakı, Nizami rayonu',
      'Bakı, Pirallahı rayonu',
      'Bakı, Sabunçu rayonu',
      'Bakı, Suraxanı rayonu',
      'Bakı, Səbail rayonu',
      'Bakı, Yasamal rayonu',
    ],
  },
  {
    label: 'Rayonlar',
    locations: [
      'Abşeron',
      'Ağcabədi',
      'Ağdam',
      'Ağdaş',
      'Ağstafa',
      'Ağsu',
      'Astara',
      'Balakən',
      'Bərdə',
      'Beyləqan',
      'Biləsuvar',
      'Cəbrayıl',
      'Cəlilabad',
      'Daşkəsən',
      'Füzuli',
      'Gədəbəy',
      'Goranboy',
      'Göyçay',
      'Göygöl',
      'Hacıqabul',
      'İmişli',
      'İsmayıllı',
      'Kəlbəcər',
      'Kürdəmir',
      'Laçın',
      'Lerik',
      'Masallı',
      'Neftçala',
      'Oğuz',
      'Qax',
      'Qazax',
      'Qəbələ',
      'Qobustan',
      'Quba',
      'Qubadlı',
      'Qusar',
      'Saatlı',
      'Sabirabad',
      'Salyan',
      'Samux',
      'Siyəzən',
      'Şabran',
      'Şamaxı',
      'Şəmkir',
      'Şuşa',
      'Tərtər',
      'Tovuz',
      'Ucar',
      'Xaçmaz',
      'Xızı',
      'Xocalı',
      'Xocavənd',
      'Yardımlı',
      'Zaqatala',
      'Zəngilan',
      'Zərdab',
    ],
  },
  {
    label: 'Naxçıvan MR',
    locations: [
      'Babək',
      'Culfa',
      'Kəngərli',
      'Ordubad',
      'Sədərək',
      'Şahbuz',
      'Şərur',
    ],
  },
] as const;

/** Bütün ünvan dəyərlərinin düz siyahısı */
export const AZERBAIJAN_LOCATIONS: readonly string[] =
  AZERBAIJAN_LOCATION_GROUPS.flatMap((group) => [...group.locations]);

const LOCATION_SET = new Set<string>(AZERBAIJAN_LOCATIONS);

export const BAKU_CITY = 'Bakı';

export function isBakuInternalDistrict(location: string): boolean {
  return location.trim().startsWith(`${BAKU_CITY},`);
}

/**
 * Dropdown üçün: şəhər və rayonlar tək-tək.
 * Bakı daxili inzibati rayonlar (`Bakı, Nəsimi rayonu` və s.) daxil deyil —
 * xidmət ərazisi kimi `Bakı` seçilir; müştəri ünvanında rayon ayrıca dropdown-dadır.
 */
export const AZERBAIJAN_PICKER_LOCATIONS: readonly string[] = [
  ...AZERBAIJAN_LOCATIONS,
]
  .filter((loc) => loc === BAKU_CITY || !isBakuInternalDistrict(loc))
  .sort((a, b) => a.localeCompare(b, 'az'));

/** Bakı daxili inzibati rayonlar (`Bakı, Nəsimi rayonu` və s.) — şəhər özü yoxdur */
export const BAKU_DISTRICT_LOCATIONS: readonly string[] = AZERBAIJAN_LOCATIONS.filter(
  isBakuInternalDistrict,
).sort((a, b) => a.localeCompare(b, 'az'));

/** Bakı şəhəri + Bakı daxili rayon etiketləri */
export const BAKU_SERVICE_LOCATIONS: readonly string[] =
  AZERBAIJAN_LOCATIONS.filter(
    (loc) => loc === BAKU_CITY || loc.startsWith(`${BAKU_CITY},`),
  );

/** `Bakı, Nəsimi rayonu` → `Nəsimi rayonu` */
export function bakuDistrictDisplayName(location: string): string {
  return location.replace(/^Bakı,\s*/i, '').trim();
}

/**
 * Picker dəyərini şəhər + (opsional) Bakı rayonu hissələrinə ayırır.
 * `Bakı, Nəsimi rayonu` → city=`Bakı`, district=`Bakı, Nəsimi rayonu`.
 */
export function parsePickerLocation(value: string): {
  city: string;
  district: string;
} {
  const trimmed = value.trim();
  if (!trimmed) return { city: '', district: '' };
  if (isBakuInternalDistrict(trimmed)) {
    return { city: BAKU_CITY, district: trimmed };
  }
  return { city: trimmed, district: '' };
}

/**
 * Xidmət ərazisini şəhər səviyyəsinə endirir.
 * Bakı daxili rayonlar (`Bakı, Nəsimi rayonu` və s.) → `Bakı`.
 * Digər şəhər/rayonlar olduğu kimi qalır (`Lerik` → `Lerik`).
 */
export function resolveServiceCity(location: string): string {
  const trimmed = location.trim();
  if (!trimmed) return trimmed;
  if (trimmed === BAKU_CITY || trimmed.startsWith(`${BAKU_CITY},`)) {
    return BAKU_CITY;
  }
  return trimmed;
}

/** Eyni xidmət şəhərinə aiddirmi (Bakı daxili rayonlar birləşir) */
export function locationsServeSameCity(a: string, b: string): boolean {
  return resolveServiceCity(a) === resolveServiceCity(b);
}

/**
 * Verilmiş şəhərə uyğun bütün kataloq etiketləri
 * (məs. Bakı → `Bakı` + bütün Bakı rayonları).
 */
export function locationLabelsForCity(cityOrLocation: string): readonly string[] {
  const city = resolveServiceCity(cityOrLocation);
  if (city === BAKU_CITY) return BAKU_SERVICE_LOCATIONS;
  return AZERBAIJAN_LOCATIONS.filter((loc) => resolveServiceCity(loc) === city);
}

export function isAzerbaijanLocation(value: string): boolean {
  return LOCATION_SET.has(value.trim());
}

/**
 * Müştəri sifariş ünvanı: kataloqda olmalıdır.
 * Bakı tək başına kifayət etmir — daxili inzibati rayon da seçilməlidir.
 */
export function isCompleteBookingLocation(value: string): boolean {
  const trimmed = value.trim();
  if (!isAzerbaijanLocation(trimmed)) return false;
  return trimmed !== BAKU_CITY;
}

/** Respublika şəhərlərinin təxmini mərkəzi — geokod uğursuz olanda INSTANT dest fallback */
const CITY_CENTROIDS: Readonly<Record<string, { lat: number; lng: number }>> = {
  Bakı: { lat: 40.4093, lng: 49.8671 },
  Gəncə: { lat: 40.6828, lng: 46.3606 },
  Sumqayıt: { lat: 40.5897, lng: 49.6686 },
  Mingəçevir: { lat: 40.7703, lng: 47.0489 },
  Naftalan: { lat: 40.5067, lng: 46.825 },
  Şirvan: { lat: 39.9378, lng: 48.929 },
  Şəki: { lat: 41.1919, lng: 47.1706 },
  Yevlax: { lat: 40.6181, lng: 47.1501 },
  Lənkəran: { lat: 38.7536, lng: 48.8511 },
  Xankəndi: { lat: 39.8178, lng: 46.7528 },
  Naxçıvan: { lat: 39.2089, lng: 45.4122 },
};

/** Azərbaycanın coğrafi mərkəzinə yaxın nöqtə — kataloq şəhəri üçün xüsusi centroid yoxdursa */
const AZERBAIJAN_FALLBACK_CENTROID = { lat: 40.1431, lng: 47.5769 };

/**
 * Kataloq ünvanının təxmini koordinatı (Bakı daxili rayonlar → Bakı mərkəzi).
 * GPS əvəzi deyil — yalnız geokod/xəritə olmadıqda dispatch sıralaması üçün.
 */
export function catalogLocationCentroid(
  location: string,
): { lat: number; lng: number } {
  const city = resolveServiceCity(location);
  return CITY_CENTROIDS[city] ?? AZERBAIJAN_FALLBACK_CENTROID;
}

/**
 * Ünvan / reverse-geocode mətnindən kataloq ünvanı tapır.
 * Əvvəl uzun etiketlər (Bakı rayonları), sonra şəhər/rayon adları.
 */
export function matchCatalogLocationFromText(text: string): string | null {
  const raw = text.trim();
  if (!raw) return null;

  const normalized = normalizeLocationText(raw);

  const sorted = [...AZERBAIJAN_LOCATIONS].sort((a, b) => b.length - a.length);
  for (const loc of sorted) {
    if (normalized.includes(normalizeLocationText(loc))) {
      return loc;
    }
  }

  // Bakı rayon adı tək başına (OSM: "Yasamal, Baku, …")
  for (const loc of BAKU_SERVICE_LOCATIONS) {
    if (loc === BAKU_CITY) continue;
    const district = loc
      .replace(/^Bakı,\s*/i, '')
      .replace(/\s*rayonu$/i, '')
      .trim();
    if (
      district &&
      normalized.includes(normalizeLocationText(district)) &&
      (normalized.includes('bak') || normalized.includes('baku'))
    ) {
      return loc;
    }
  }

  if (
    /\bbak[ıi]\b/.test(normalized) ||
    normalized.includes('baku') ||
    normalized.includes('баку')
  ) {
    return BAKU_CITY;
  }

  return null;
}

function normalizeLocationText(value: string): string {
  return value
    .toLocaleLowerCase('az')
    .replace(/ə/g, 'e')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ğ/g, 'g')
    .replace(/ç/g, 'c')
    .replace(/ş/g, 's')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
