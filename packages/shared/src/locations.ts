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

const BAKU_CITY = 'Bakı';

/** Bakı şəhəri + Bakı daxili rayon etiketləri */
export const BAKU_SERVICE_LOCATIONS: readonly string[] =
  AZERBAIJAN_LOCATIONS.filter(
    (loc) => loc === BAKU_CITY || loc.startsWith(`${BAKU_CITY},`),
  );

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
