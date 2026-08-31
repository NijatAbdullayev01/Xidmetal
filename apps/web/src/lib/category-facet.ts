import { findLocationBySlug, findServiceTypeTitle } from '@xidmetal/shared';

export type CategoryFacet =
  | { kind: 'none' }
  | { kind: 'type'; typeSlug: string; typeTitle: string }
  | { kind: 'location'; locationSlug: string; locationLabel: string }
  | {
      kind: 'location-type';
      locationSlug: string;
      locationLabel: string;
      typeSlug: string;
      typeTitle: string;
    }
  | { kind: 'invalid' };

export function parseCategoryFacet(
  facet: string[] | undefined,
  typeTitles: readonly string[],
): CategoryFacet {
  if (!facet || facet.length === 0) return { kind: 'none' };

  if (facet.length === 2 && facet[0] === 'type' && facet[1]) {
    const typeTitle = findServiceTypeTitle(typeTitles, facet[1]);
    if (!typeTitle) return { kind: 'invalid' };
    return { kind: 'type', typeSlug: facet[1], typeTitle };
  }

  if (facet.length === 2 && facet[0] === 'in' && facet[1]) {
    const locationLabel = findLocationBySlug(facet[1]);
    if (!locationLabel) return { kind: 'invalid' };
    return { kind: 'location', locationSlug: facet[1], locationLabel };
  }

  if (
    facet.length === 4 &&
    facet[0] === 'in' &&
    facet[1] &&
    facet[2] === 'type' &&
    facet[3]
  ) {
    const locationLabel = findLocationBySlug(facet[1]);
    const typeTitle = findServiceTypeTitle(typeTitles, facet[3]);
    if (!locationLabel || !typeTitle) return { kind: 'invalid' };
    return {
      kind: 'location-type',
      locationSlug: facet[1],
      locationLabel,
      typeSlug: facet[3],
      typeTitle,
    };
  }

  return { kind: 'invalid' };
}

export function categoryFacetPath(
  categorySlug: string,
  facet: Exclude<CategoryFacet, { kind: 'invalid' }>,
): string {
  if (facet.kind === 'none') return `/categories/${categorySlug}`;
  if (facet.kind === 'type') {
    return `/categories/${categorySlug}/type/${facet.typeSlug}`;
  }
  if (facet.kind === 'location') {
    return `/categories/${categorySlug}/in/${facet.locationSlug}`;
  }
  return `/categories/${categorySlug}/in/${facet.locationSlug}/type/${facet.typeSlug}`;
}

export function categoryListingCopy(input: {
  categoryName: string;
  categoryDescription?: string | null;
  typeTitle?: string;
  locationLabel?: string;
  locationLocative?: string;
}): { title: string; h1: string; description: string; intro: string } {
  const { categoryName, typeTitle, locationLabel, locationLocative } = input;
  const locative = locationLocative || locationLabel;

  if (typeTitle && locative && locationLabel) {
    const title = `${locative} ${typeTitle.toLocaleLowerCase('az')}`;
    return {
      title,
      h1: title,
      description: `${locative} ${typeTitle.toLocaleLowerCase('az')} xidməti — qiymət, reytinq və rəylərə görə müqayisə edin, ${categoryName.toLocaleLowerCase('az')} kateqoriyasında sifariş verin.`,
      intro: `${locationLabel} üzrə «${typeTitle}» elanları. Xidmət verənləri müqayisə edin və birbaşa sifariş göndərin.`,
    };
  }

  if (typeTitle) {
    return {
      title: `${typeTitle} — ${categoryName}`,
      h1: typeTitle,
      description: `${typeTitle} üzrə etibarlı xidmət verənləri ${categoryName.toLocaleLowerCase('az')} kateqoriyasında tapın, qiymət və reytinqə görə müqayisə edin.`,
      intro: `${categoryName} kateqoriyasında «${typeTitle}» xidmətləri. Təsviri oxuyun, rəylərə baxın və uyğun elanı seçin.`,
    };
  }

  if (locative && locationLabel) {
    const title = `${locative} ${categoryName.toLocaleLowerCase('az')} xidmətləri`;
    return {
      title,
      h1: title,
      description: `${locative} ${categoryName.toLocaleLowerCase('az')} — etibarlı xidmət verənləri müqayisə edin, rəyləri oxuyun və sifariş verin.`,
      intro: `${locationLabel} ərazisində ${categoryName.toLocaleLowerCase('az')} elanları. Qiymət, məkan və reytinqə görə seçin.`,
    };
  }

  return {
    title: `${categoryName} xidmətləri`,
    h1: `${categoryName} xidmətləri`,
    description:
      input.categoryDescription?.trim() ||
      `${categoryName} kateqoriyasında etibarlı xidmət verənləri tapın, müqayisə edin və sifariş verin.`,
    intro:
      input.categoryDescription?.trim() ||
      `Axtardığınız ${categoryName.toLocaleLowerCase('az')} xidmətini seçin və etibarlı xidmət verənləri müqayisə edin.`,
  };
}
