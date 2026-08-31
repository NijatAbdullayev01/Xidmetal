import { AZERBAIJAN_LOCATIONS } from './locations';
import { locationPublicSlug, serviceTypeSlug } from './slug';

const LOCATION_BY_SLUG: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const location of AZERBAIJAN_LOCATIONS) {
    const slug = locationPublicSlug(location);
    if (slug && !map.has(slug)) {
      map.set(slug, location);
    }
  }
  return map;
})();

export function findLocationBySlug(slug: string): string | null {
  const key = slug.trim().toLowerCase();
  if (!key) return null;
  return LOCATION_BY_SLUG.get(key) ?? null;
}

export function findServiceTypeTitle(
  types: readonly string[],
  typeSlug: string,
): string | null {
  const key = typeSlug.trim().toLowerCase();
  if (!key) return null;
  return types.find((type) => serviceTypeSlug(type) === key) ?? null;
}
