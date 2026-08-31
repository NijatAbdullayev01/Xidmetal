const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

const AZ_CHAR_MAP: Record<string, string> = {
  ə: 'e',
  Ə: 'e',
  ı: 'i',
  I: 'i',
  İ: 'i',
  i: 'i',
  ö: 'o',
  Ö: 'o',
  ü: 'u',
  Ü: 'u',
  ş: 's',
  Ş: 's',
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
};

export function slugifyAz(value: string, maxLength = 60): string {
  const mapped = [...value.trim()]
    .map((char) => AZ_CHAR_MAP[char] ?? char)
    .join('')
    .toLocaleLowerCase('en')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');

  return mapped;
}

/** Public permalink — title + id prefiksi, toqquşmasın. */
export function buildServiceSlug(title: string, serviceId: string): string {
  const base = slugifyAz(title) || 'xidmet';
  const suffix = serviceId.replace(/-/g, '').slice(0, 8);
  return `${base}-${suffix}`;
}

export function servicePublicPath(service: { id: string; slug?: string | null }): string {
  return `/services/${service.slug || service.id}`;
}

export function serviceTypeSlug(title: string): string {
  return slugifyAz(title) || 'nov';
}

export function locationPublicSlug(location: string): string {
  return slugifyAz(location) || 'mekan';
}

export function providerPublicPath(providerId: string): string {
  return `/providers/${providerId}`;
}

export function categoryTypePath(categorySlug: string, typeTitle: string): string {
  return `/categories/${categorySlug}/type/${serviceTypeSlug(typeTitle)}`;
}

export function categoryLocationPath(categorySlug: string, location: string): string {
  return `/categories/${categorySlug}/in/${locationPublicSlug(location)}`;
}

export function categoryLocationTypePath(
  categorySlug: string,
  location: string,
  typeTitle: string,
): string {
  return `${categoryLocationPath(categorySlug, location)}/type/${serviceTypeSlug(typeTitle)}`;
}
