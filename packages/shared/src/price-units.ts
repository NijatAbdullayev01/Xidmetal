import { PriceUnit } from './enums';

export const CLEANING_CATEGORY_SLUG = 'temizlik';
export const DISINFECTION_CATEGORY_SLUG = 'dezinfeksiya';

/** Kvadrat başına qiymət icazəli kateqoriyalar */
const PER_SQM_CATEGORY_SLUGS = new Set([
  CLEANING_CATEGORY_SLUG,
  DISINFECTION_CATEGORY_SLUG,
]);

export const PRICE_UNIT_VALUES = [
  PriceUnit.FIXED,
  PriceUnit.HOURLY,
  PriceUnit.DAILY,
  PriceUnit.PER_SQM,
] as const;

export type PriceUnitValue = (typeof PRICE_UNIT_VALUES)[number];

export const DEFAULT_PRICE_UNITS: PriceUnitValue[] = [
  PriceUnit.FIXED,
  PriceUnit.HOURLY,
  PriceUnit.DAILY,
];

export const PRICE_UNIT_LABELS: Record<PriceUnitValue, string> = {
  [PriceUnit.FIXED]: 'Sabit',
  [PriceUnit.HOURLY]: 'Saatlıq',
  [PriceUnit.DAILY]: 'Günlük',
  [PriceUnit.PER_SQM]: 'Kvadrat',
};

export function getPriceUnitsForCategorySlug(slug?: string): PriceUnitValue[] {
  if (slug && PER_SQM_CATEGORY_SLUGS.has(slug)) {
    return [...DEFAULT_PRICE_UNITS, PriceUnit.PER_SQM];
  }
  return DEFAULT_PRICE_UNITS;
}

export function allowsPerSqmPriceUnit(slug?: string): boolean {
  return Boolean(slug && PER_SQM_CATEGORY_SLUGS.has(slug));
}

export function getPriceUnitLabel(unit: string): string {
  return PRICE_UNIT_LABELS[unit as PriceUnitValue] ?? unit;
}
