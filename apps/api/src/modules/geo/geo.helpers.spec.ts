import { describe, expect, it } from 'vitest';
import {
  AZERBAIJAN_PICKER_LOCATIONS,
  BAKU_DISTRICT_LOCATIONS,
  bakuDistrictDisplayName,
  catalogLocationCentroid,
  haversineDistanceMeters,
  isCompleteBookingLocation,
  isValidCoordinates,
  isValidHeading,
  kmToMeters,
  locationsServeSameCity,
  matchCatalogLocationFromText,
  parsePickerLocation,
} from '@xidmetal/shared';
import {
  buildStDistanceSelect,
  buildStDWithinPredicate,
  nearbyRadiusMeters,
} from './geo-query';

describe('geo helpers (shared)', () => {
  it('validates coordinates', () => {
    expect(isValidCoordinates(40.4093, 49.8671)).toBe(true);
    expect(isValidCoordinates(91, 0)).toBe(false);
    expect(isValidHeading(180)).toBe(true);
    expect(isValidHeading(400)).toBe(false);
  });

  it('haversine distance around Baku', () => {
    const d = haversineDistanceMeters(
      { lat: 40.4093, lng: 49.8671 },
      { lat: 40.41, lng: 49.87 },
    );
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(500);
    expect(kmToMeters(5)).toBe(5_000);
  });
});

describe('geo-query builders', () => {
  it('nearbyRadiusMeters', () => {
    expect(nearbyRadiusMeters(10)).toBe(10_000);
  });

  it('ST_DWithin predicate includes geography cast', () => {
    const sql = buildStDWithinPredicate('pp');
    expect(sql).toContain('ST_DWithin');
    expect(sql).toContain('::geography');
    expect(sql).toContain('pp.last_location');
  });

  it('ST_Distance select', () => {
    const sql = buildStDistanceSelect('pp');
    expect(sql).toContain('ST_Distance');
    expect(sql).toContain('distance_m');
  });
});

describe('catalog location (təcili sifariş)', () => {
  it('ünvandan Bakı şəhərini tapır', () => {
    expect(matchCatalogLocationFromText('Nizami küçəsi 12, Bakı')).toBe('Bakı');
    expect(matchCatalogLocationFromText('Baku')).toBe('Bakı');
  });

  it('Bakı daxili rayonlar eyni şəhər sayılır', () => {
    expect(
      locationsServeSameCity('Bakı, Binəqədi rayonu', 'Bakı, Nizami rayonu'),
    ).toBe(true);
    expect(locationsServeSameCity('Bakı', 'Lerik')).toBe(false);
  });

  it('geokod olmadan şəhər mərkəzi verir', () => {
    const baku = catalogLocationCentroid('Bakı, Binəqədi rayonu');
    expect(baku.lat).toBeCloseTo(40.4093);
    expect(baku.lng).toBeCloseTo(49.8671);
  });

  it('picker siyahısında şəhər və rayonlar tək-təkdir', () => {
    expect(AZERBAIJAN_PICKER_LOCATIONS).toContain('Bakı');
    expect(AZERBAIJAN_PICKER_LOCATIONS).toContain('Lerik');
    expect(AZERBAIJAN_PICKER_LOCATIONS).toContain('Babək');
    expect(
      AZERBAIJAN_PICKER_LOCATIONS.some((loc) => loc.startsWith('Bakı,')),
    ).toBe(false);
    expect(new Set(AZERBAIJAN_PICKER_LOCATIONS).size).toBe(
      AZERBAIJAN_PICKER_LOCATIONS.length,
    );
  });

  it('Bakı rayonları şəhər pickerindən ayrı siyahıdadır', () => {
    expect(BAKU_DISTRICT_LOCATIONS).toContain('Bakı, Nəsimi rayonu');
    expect(BAKU_DISTRICT_LOCATIONS).toContain('Bakı, Yasamal rayonu');
    expect(BAKU_DISTRICT_LOCATIONS).not.toContain('Bakı');
    expect(bakuDistrictDisplayName('Bakı, Nəsimi rayonu')).toBe('Nəsimi rayonu');
  });

  it('müştəri ünvanında Bakı tək başına yetərli deyil', () => {
    expect(isCompleteBookingLocation('Bakı')).toBe(false);
    expect(isCompleteBookingLocation('Bakı, Nəsimi rayonu')).toBe(true);
    expect(isCompleteBookingLocation('Gəncə')).toBe(true);
    expect(isCompleteBookingLocation('')).toBe(false);
  });

  it('picker dəyərini şəhər və Bakı rayonuna ayırır', () => {
    expect(parsePickerLocation('Bakı, Nəsimi rayonu')).toEqual({
      city: 'Bakı',
      district: 'Bakı, Nəsimi rayonu',
    });
    expect(parsePickerLocation('Bakı')).toEqual({ city: 'Bakı', district: '' });
    expect(parsePickerLocation('Lerik')).toEqual({ city: 'Lerik', district: '' });
  });
});
