import { describe, expect, it } from 'vitest';
import { parseCategoryFacet, categoryFacetPath, categoryListingCopy } from './category-facet';

const TYPES = ['Ev təmizliyi', 'Ofis təmizliyi'];

describe('parseCategoryFacet', () => {
  it('boş facet-i hub kimi oxuyur', () => {
    expect(parseCategoryFacet(undefined, TYPES)).toEqual({ kind: 'none' });
  });

  it('növ və məkan sluqlarını tanıyır', () => {
    expect(parseCategoryFacet(['type', 'ev-temizliyi'], TYPES)).toMatchObject({
      kind: 'type',
      typeTitle: 'Ev təmizliyi',
    });
    expect(parseCategoryFacet(['in', 'baki'], TYPES)).toMatchObject({
      kind: 'location',
      locationLabel: 'Bakı',
    });
    expect(parseCategoryFacet(['in', 'baki', 'type', 'ev-temizliyi'], TYPES)).toMatchObject({
      kind: 'location-type',
      locationLabel: 'Bakı',
      typeTitle: 'Ev təmizliyi',
    });
  });

  it('naməlum yolu invalid sayır', () => {
    expect(parseCategoryFacet(['type', 'yoxdur'], TYPES).kind).toBe('invalid');
    expect(parseCategoryFacet(['foo'], TYPES).kind).toBe('invalid');
  });
});

describe('categoryFacetPath', () => {
  it('canonical path qurur', () => {
    expect(categoryFacetPath('temizlik', { kind: 'none' })).toBe('/categories/temizlik');
    expect(
      categoryFacetPath('temizlik', {
        kind: 'type',
        typeSlug: 'ev-temizliyi',
        typeTitle: 'Ev təmizliyi',
      }),
    ).toBe('/categories/temizlik/type/ev-temizliyi');
  });
});

describe('categoryListingCopy', () => {
  it('hub, növ və şəhər üçün unikal başlıq verir', () => {
    expect(categoryListingCopy({ categoryName: 'Təmizlik' }).h1).toBe('Təmizlik xidmətləri');
    expect(
      categoryListingCopy({ categoryName: 'Təmizlik', typeTitle: 'Ev təmizliyi' }).title,
    ).toBe('Ev təmizliyi — Təmizlik');
    expect(
      categoryListingCopy({
        categoryName: 'Təmizlik',
        locationLabel: 'Bakı',
        locationLocative: 'Bakıda',
      }).title,
    ).toBe('Bakıda təmizlik xidmətləri');
  });
});
